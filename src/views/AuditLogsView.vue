<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { RouterLink } from "vue-router";
import { Download, Eye, RotateCcw, Search, X } from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDate, formatDateTime } from "../utils/date";
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
const documentPreviewUrl = ref("");
const documentPreviewOpen = ref(false);
const documentPreviewName = ref("vehicle-document");
const documentPreviewType = ref("");
const documentPreviewIsPdf = computed(
  () =>
    documentPreviewType.value === "application/pdf" ||
    documentPreviewName.value.toLowerCase().endsWith(".pdf"),
);
const documentPreviewIsImage = computed(
  () =>
    documentPreviewType.value.startsWith("image/") ||
    /\.(?:jpe?g|png)$/i.test(documentPreviewName.value),
);
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
  if (value === "file_path") return "File";
  if (value === "vehicle_id") return "Vehicle";
  return value.replaceAll(".", " ").replaceAll("_", " ");
}
async function viewDocumentFile(
  row: AuditLog,
  path: unknown,
  version: "old" | "new",
) {
  if (!path) return;
  const response = await api.get(`/audit-logs/${row.id}/document-file`, {
    params: { version },
    responseType: "blob",
  });
  closeDocumentPreview();
  documentPreviewUrl.value = URL.createObjectURL(response.data);
  documentPreviewName.value =
    String(path).split("/").pop() || "vehicle-document";
  documentPreviewType.value = response.data.type || "";
  documentPreviewOpen.value = true;
}
function downloadPreviewDocument() {
  if (!documentPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = documentPreviewUrl.value;
  link.download = documentPreviewName.value;
  link.click();
}
function closeDocumentPreview() {
  documentPreviewOpen.value = false;
  if (documentPreviewUrl.value) {
    URL.revokeObjectURL(documentPreviewUrl.value);
    documentPreviewUrl.value = "";
  }
}
function value(value: unknown, key = "") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && key.endsWith("_date")) {
    return formatDate(value);
  }
  if (
    typeof value === "string" &&
    (key.endsWith("_at") || /^\d{4}-\d{2}-\d{2}T/.test(value))
  ) {
    return formatDateTime(value);
  }
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
onBeforeUnmount(closeDocumentPreview);
</script>

<template>
  <div>
    <PageHeader
      title="Audit log"
      description="Review important activity and data changes across your vehicle."
    >
      <button
        v-if="auth.can('audit.export')"
        class="btn"
        :disabled="exporting"
        @click="exportCsv"
      >
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
        <button class="btn" @click="clearFilters"><RotateCcw aria-hidden="true" /> Reset</button>
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
                <td>
                  <button
                    v-if="change.key === 'file_path' && change.old"
                    type="button"
                    class="table-action"
                    @click="viewDocumentFile(selected, change.old, 'old')"
                  >
                    <Eye />View</button
                  ><RouterLink
                    v-else-if="change.key === 'vehicle_id' && change.old"
                    class="source-link"
                    :to="`/vehicles/${change.old}`"
                    @click="selected = null"
                    >Vehicle #{{ change.old }}</RouterLink
                  ><template v-else>{{
                    value(change.old, change.key)
                  }}</template>
                </td>
                <td>
                  <button
                    v-if="change.key === 'file_path' && change.new"
                    type="button"
                    class="table-action"
                    @click="viewDocumentFile(selected, change.new, 'new')"
                  >
                    <Eye />View</button
                  ><RouterLink
                    v-else-if="change.key === 'vehicle_id' && change.new"
                    class="source-link"
                    :to="`/vehicles/${change.new}`"
                    @click="selected = null"
                    >Vehicle #{{ change.new }}</RouterLink
                  ><template v-else>{{
                    value(change.new, change.key)
                  }}</template>
                </td>
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
    <div
      v-if="documentPreviewOpen"
      class="modal-backdrop photo-preview-backdrop"
      @click.self="closeDocumentPreview"
    >
      <div
        class="photo-preview-modal document-preview-modal"
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-head">
          <div>
            <h2>Document preview</h2>
            <p>{{ documentPreviewName }}</p>
          </div>
          <div class="modal-head-actions">
            <button type="button" class="btn" @click="downloadPreviewDocument">
              <Download />Download
            </button>
            <button
              type="button"
              class="icon-btn"
              aria-label="Close"
              @click="closeDocumentPreview"
            >
              <X />
            </button>
          </div>
        </div>
        <div class="document-preview-body">
          <iframe
            v-if="documentPreviewIsPdf"
            :src="documentPreviewUrl"
            title="Audited document preview"
          ></iframe>
          <img
            v-else-if="documentPreviewIsImage"
            :src="documentPreviewUrl"
            alt="Audited document preview"
          />
          <EmptyState
            v-else
            title="Preview unavailable"
            message="This file type cannot be previewed. Use Download to open it on your device."
          />
        </div>
      </div>
    </div>
  </div>
</template>
