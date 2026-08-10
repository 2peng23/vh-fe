<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { Download, Eye, Search, X } from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDateTime } from "../utils/date";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();

type AuditLog = {
  id: number;
  action: string;
  entity_name: string;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: { name: string; email: string } | null;
};

const rows = ref<AuditLog[]>([]);
const meta = ref<PaginationMeta>();
const loading = ref(true);
const exporting = ref(false);
const error = ref("");
const page = ref(1);
const perPage = ref(20);
const selected = ref<AuditLog | null>(null);
const options = ref<{
  actions: string[];
  entities: { value: string; label: string }[];
}>({
  actions: [],
  entities: [],
});
const filters = reactive({
  search: "",
  action: "",
  entity_type: "",
  from: "",
  to: "",
});

function params() {
  return { ...filters, page: page.value, per_page: perPage.value };
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AuditLog[]>>("/audit-logs", {
      params: params(),
    });
    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function applyFilters() {
  page.value = 1;
  load();
}
function clearFilters() {
  Object.assign(filters, {
    search: "",
    action: "",
    entity_type: "",
    from: "",
    to: "",
  });
  applyFilters();
}
async function exportCsv() {
  exporting.value = true;
  try {
    const response = await api.get("/audit-logs", {
      params: { ...filters, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehiclehub-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    exporting.value = false;
  }
}
function label(value: string) {
  return value.replaceAll(".", " ").replaceAll("_", " ");
}
function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function changes(row: AuditLog) {
  const keys = new Set([
    ...Object.keys(row.old_values || {}),
    ...Object.keys(row.new_values || {}),
  ]);
  return [...keys]
    .filter((key) => !["updated_at", "created_at"].includes(key))
    .map((key) => ({
      key,
      old: row.old_values?.[key],
      new: row.new_values?.[key],
    }));
}

onMounted(async () => {
  try {
    const { data } = await api.get<ApiEnvelope<typeof options.value>>(
      "/audit-logs/options",
    );
    options.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  }
  load();
});
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
</script>

<template>
  <div>
    <PageHeader
      title="Audit log"
      description="Review important activity and data changes across your vehicle."
    >
      <button v-if="auth.can('audit.export')" class="btn" :disabled="exporting" @click="exportCsv">
        <Download />{{ exporting ? "Exporting…" : "Export CSV" }}
      </button>
    </PageHeader>
    <div class="toolbar audit-filters">
      <label class="audit-search"
        >Search
        <div>
          <Search /><input
            v-model="filters.search"
            placeholder="User, action or record ID"
            @keyup.enter="applyFilters"
          /></div
      ></label>
      <label
        >Action<select v-model="filters.action">
          <option value="">All actions</option>
          <option v-for="item in options.actions" :key="item" :value="item">
            {{ label(item) }}
          </option>
        </select></label
      >
      <label
        >Entity<select v-model="filters.entity_type">
          <option value="">All entities</option>
          <option
            v-for="item in options.entities"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select></label
      >
      <label>From<input v-model="filters.from" type="date" /></label>
      <label>To<input v-model="filters.to" type="date" /></label>
      <button class="btn btn-primary" @click="applyFilters">Apply</button>
      <button class="btn" @click="clearFilters">Clear</button>
    </div>
    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="!rows.length"
      title="No audit activity found"
      message="Try changing the filters or perform a vehicle action."
    />
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date and time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ formatDateTime(row.created_at) }}</td>
              <td>
                <strong>{{ row.user?.name || "System" }}</strong
                ><small v-if="row.user?.email" class="cell-small">{{
                  row.user.email
                }}</small>
              </td>
              <td>
                <span class="audit-action">{{ label(row.action) }}</span>
              </td>
              <td>
                {{ row.entity_name
                }}<small class="cell-small">#{{ row.entity_id || "—" }}</small>
              </td>
              <td>{{ row.ip_address || "—" }}</td>
              <td>
                <button
                  class="icon-btn"
                  title="View changes"
                  @click="selected = row"
                >
                  <Eye />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls
        v-if="meta"
        :meta="meta"
        v-model:page="page"
        v-model:per-page="perPage"
      />
    </div>
    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <section class="modal audit-detail-modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h2>{{ label(selected.action) }}</h2>
            <p>
              {{ selected.entity_name }} #{{ selected.entity_id }} ·
              {{ formatDateTime(selected.created_at) }}
            </p>
          </div>
          <button class="icon-btn" @click="selected = null"><X /></button>
        </div>
        <div class="audit-context">
          <div>
            <small>Performed by</small
            ><strong>{{ selected.user?.name || "System" }}</strong>
          </div>
          <div>
            <small>IP address</small
            ><strong>{{ selected.ip_address || "—" }}</strong>
          </div>
          <div class="full">
            <small>User agent</small
            ><span>{{ selected.user_agent || "—" }}</span>
          </div>
        </div>
        <div class="table-wrap audit-changes">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Previous value</th>
                <th>New value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="change in changes(selected)" :key="change.key">
                <td>{{ label(change.key) }}</td>
                <td>{{ value(change.old) }}</td>
                <td>{{ value(change.new) }}</td>
              </tr>
              <tr v-if="!changes(selected).length">
                <td colspan="3" class="empty-cell">
                  No field-level changes recorded.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="selected = null">Close</button>
        </div>
      </section>
    </div>
  </div>
</template>
