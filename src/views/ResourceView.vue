<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { Plus, X } from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDate } from "../utils/date";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const props = defineProps<{
    resource: string;
    title: string;
    description: string;
  }>(),
  rows = ref<any[]>([]),
  meta = ref<PaginationMeta>(),
  page = ref(1),
  perPage = ref(20),
  loading = ref(true),
  modal = ref(false),
  saving = ref(false),
  error = ref(""),
  form = reactive<Record<string, any>>({});
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>(`/${props.resource}`, {
      params: { page: page.value, per_page: perPage.value },
    });
    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function open() {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(
    form,
    props.resource === "drivers"
      ? {
          name: "",
          employee_number: "",
          email: "",
          phone: "",
          license_number: "",
          license_type: "",
          license_expiration: "",
          status: "active",
        }
      : {
          vehicle_id: "",
          driver_id: "",
          assigned_at: new Date().toISOString().slice(0, 10),
          status: "active",
          notes: "",
        },
  );
  modal.value = true;
}
async function save() {
  saving.value = true;
  try {
    await api.post(`/${props.resource}`, form);
    modal.value = false;
    load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
watch(() => props.resource, load);
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
</script>
<template>
  <div>
    <PageHeader :title="title" :description="description"
      ><button v-if="auth.can(`${resource}.create`)" class="btn btn-primary" @click="open">
        <Plus />Add
        {{ resource === "drivers" ? "driver" : "assignment" }}
      </button></PageHeader
    >
    <div class="alert error" v-if="error">{{ error }}</div>
    <LoadingState v-if="loading" /><EmptyState
      v-else-if="!rows.length"
      :title="`No ${resource} yet`"
    />
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <template v-if="resource === 'drivers'"
                ><th>Driver</th>
                <th>Employee no.</th>
                <th>License</th>
                <th>Expiration</th>
                <th>Status</th></template
              ><template v-else
                ><th>Vehicle ID</th>
                <th>Driver ID</th>
                <th>Assigned</th>
                <th>Returned</th>
                <th>Status</th></template
              >
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <template v-if="resource === 'drivers'"
                ><td>
                  <strong>{{ r.name }}</strong
                  ><small class="cell-small">{{ r.email || r.phone }}</small>
                </td>
                <td>{{ r.employee_number || "—" }}</td>
                <td>
                  {{ r.license_number || "—"
                  }}<small class="cell-small">{{ r.license_type }}</small>
                </td>
                <td>{{ formatDate(r.license_expiration) }}</td>
                <td>
                  <StatusBadge :status="r.status" /></td></template
              ><template v-else
                ><td>#{{ r.vehicle_id }}</td>
                <td>#{{ r.driver_id }}</td>
                <td>
                  {{ formatDate(r.assigned_at) }}
                </td>
                <td>
                  {{ formatDate(r.returned_at) }}
                </td>
                <td><StatusBadge :status="r.status" /></td
              ></template>
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
    <div class="modal-backdrop" v-if="modal" @click.self="modal = false">
      <form class="modal small-modal" @submit.prevent="save">
        <div class="modal-head">
          <div>
            <h2>
              Add
              {{ resource === "drivers" ? "driver" : "assignment" }}
            </h2>
            <p>Enter the details below.</p>
          </div>
          <button type="button" class="icon-btn" @click="modal = false">
            <X />
          </button>
        </div>
        <div class="dynamic-form">
          <label v-for="(_, key) in form" :key="key"
            >{{ String(key).replaceAll("_", " ")
            }}<select v-if="key === 'status'" v-model="form[key]">
              <option>active</option>
              <option>completed</option>
              <option>cancelled</option></select
            ><textarea
              v-else-if="key === 'notes'"
              v-model="form[key]"
            ></textarea
            ><input
              v-else
              v-model="form[key]"
              :type="
                String(key).includes('date') || String(key).includes('at')
                  ? 'date'
                  : 'text'
              "
          /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modal = false">
            Cancel</button
          ><button class="btn btn-primary" :disabled="saving">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>
