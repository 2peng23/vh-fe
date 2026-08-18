<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  CircleHelp,
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import PaginationControls from "../components/PaginationControls.vue";
import SearchableSelect from "../components/SearchableSelect.vue";
import { formatDate } from "../utils";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const route = useRoute();
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
  formError = ref(""),
  formErrors = ref<Record<string, string[]>>({}),
  vehicles = ref<any[]>([]),
  drivers = ref<any[]>([]),
  editing = ref<any | null>(null),
  viewing = ref<any | null>(null),
  photoPreviewUrl = ref(""),
  photoPreviewName = ref("driver-photo"),
  photoPreviewOpen = ref(false),
  search = ref(String(route.query.search || "")),
  form = reactive<Record<string, any>>({});
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>(`/${props.resource}`, {
      params: {
        page: page.value,
        per_page: perPage.value,
        search: search.value,
      },
    });
    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function loadAssignmentOptions() {
  if (props.resource !== "assignments") return;
  const [vehicleResponse, driverResponse] = await Promise.all([
    api.get<ApiEnvelope<any[]>>("/vehicles", { params: { per_page: 100 } }),
    api.get<ApiEnvelope<any[]>>("/drivers", { params: { per_page: 100 } }),
  ]);
  vehicles.value = vehicleResponse.data.data;
  drivers.value = driverResponse.data.data.filter(
    (driver) => driver.status === "active",
  );
}
const vehicleOptions = computed(() =>
  vehicles.value.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model}`,
    description: `${vehicle.plate_number} · ${vehicle.vehicle_code || "No vehicle code"}`,
  })),
);
const driverOptions = computed(() =>
  drivers.value.map((driver) => ({
    value: driver.id,
    label: driver.name,
    description: driver.employee_number || "No employee ID",
  })),
);
function open(row?: any) {
  editing.value = row || null;
  formError.value = "";
  formErrors.value = {};
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(
    form,
    props.resource === "drivers"
      ? {
          name: row?.name || "",
          employee_number: row?.employee_number || "",
          email: row?.email || "",
          phone: row?.phone || "",
          license_number: row?.license_number || "",
          license_type: row?.license_type || "",
          license_expiration: row?.license_expiration?.slice(0, 10) || "",
          status: row?.status || "active",
          driver_photo: null,
          license_photo: null,
        }
      : {
          vehicle_id: row?.vehicle_id || "",
          driver_id: row?.driver_id || "",
          assigned_at:
            row?.assigned_at?.slice(0, 10) ||
            new Date().toISOString().slice(0, 10),
          returned_at: row?.returned_at?.slice(0, 10) || "",
          status: row?.status || "active",
          notes: row?.notes || "",
        },
  );
  modal.value = true;
}
async function save() {
  saving.value = true;
  formError.value = "";
  formErrors.value = {};
  try {
    if (props.resource === "drivers") {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== "") payload.append(key, value);
      });
      if (editing.value) {
        payload.append("_method", "PUT");
        await api.post(`/${props.resource}/${editing.value.id}`, payload);
      } else {
        await api.post(`/${props.resource}`, payload);
      }
    } else {
      if (editing.value) {
        await api.put(`/${props.resource}/${editing.value.id}`, form);
      } else{
        await api.post(`/${props.resource}`, form);
      }
    }
    modal.value = false;
    load();
  } catch (e) {
    formError.value = errorMessage(e);
    formErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}
function fieldLabel(key: string) {
  if (key === "vehicle_id") return "Vehicle";
  if (key === "driver_id") return "Driver";
  if (key === "employee_number") return "Employee ID";
  if (key === "driver_photo") return "Driver Photo";
  if (key === "license_photo") return "License Photo";
  return key.replaceAll("_", " ");
}
function fieldHelp(key: string) {
  const help: Record<string, { text: string; optional: boolean }> = {
    name: { text: "The driver's complete name.", optional: false },
    employee_number: {
      text: "A unique Employee ID. When not provided, it is generated from the business name and six random letters or numbers.",
      optional: true,
    },
    email: {
      text: "The driver's email address for contact and records.",
      optional: true,
    },
    phone: { text: "The driver's contact phone number.", optional: true },
    license_number: {
      text: "The number printed on the driver's license.",
      optional: true,
    },
    license_type: {
      text: "The license class or restriction applicable to the driver.",
      optional: true,
    },
    license_expiration: {
      text: "The date the driver's license expires.",
      optional: true,
    },
    status: {
      text: "Whether this driver is currently active or inactive.",
      optional: true,
    },
    driver_photo: {
      text: "A clear profile photo of the driver in JPG or PNG format, up to 10 MB.",
      optional: true,
    },
    license_photo: {
      text: "A clear photo of the driver's license in JPG or PNG format, up to 10 MB.",
      optional: true,
    },
    vehicle_id: {
      text: "The vehicle that will be assigned to the selected driver.",
      optional: false,
    },
    driver_id: {
      text: "The active driver who will use or be responsible for the vehicle.",
      optional: false,
    },
    assigned_at: {
      text: "The date when the driver starts using the vehicle.",
      optional: true,
    },
    returned_at: {
      text: "The date when the driver returned the vehicle.",
      optional: true,
    },
    notes: {
      text: "Additional information about this vehicle assignment.",
      optional: true,
    },
  };
  if (key === "status" && props.resource === "assignments") {
    return {
      text: "Active means the driver currently has the vehicle. Completed means the assignment ended normally. Cancelled means it was withdrawn.",
      optional: true,
    };
  }
  return help[key];
}
function selectDriverFile(key: string, event: Event) {
  form[key] = (event.target as HTMLInputElement).files?.[0] || null;
}
async function viewDriverFile(driver: any, type: "driver" | "license") {
  const response = await api.get(`/drivers/${driver.id}/files/${type}`, {
    responseType: "blob",
  });
  closePhotoPreview();
  photoPreviewUrl.value = URL.createObjectURL(response.data);
  photoPreviewName.value = `${driver.name}-${type}-photo`;
  photoPreviewOpen.value = true;
}
function closePhotoPreview() {
  photoPreviewOpen.value = false;
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
    photoPreviewUrl.value = "";
  }
}
function downloadPhoto() {
  if (!photoPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = photoPreviewUrl.value;
  link.download = photoPreviewName.value;
  link.click();
}
onMounted(() => Promise.all([load(), loadAssignmentOptions()]));
watch(() => props.resource, () => Promise.all([load(), loadAssignmentOptions()]));
let searchTimer: number;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
});
watch(
  () => route.query.search,
  (value) => {
    search.value = String(value || "");
  },
);
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  closePhotoPreview();
});
</script>
<template>
  <div>
    <PageHeader :title="title" :description="description"
      ><button
        v-if="auth.can(`${resource}.create`)"
        class="btn btn-primary"
        @click="open()"
      >
        <Plus />Add
        {{ resource === "drivers" ? "driver" : "assignment" }}
      </button></PageHeader
    >
    <div v-if="resource === 'drivers'" class="toolbar">
      <div class="search-input">
        <Search /><input
          type="text"
          id="search-input"
          aria-label="search-input"
          v-model="search"
          placeholder="Search name, employee ID, contact or license"
        />
      </div>
    </div>
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
                <th>Employee ID</th>
                <th>License</th>
                <th>Expiration</th>
                <th>Driver Photo</th>
                <th>License Photo</th>
                <th>Status</th>
                <th>Actions</th></template
              ><template v-else
                ><th>Vehicle</th>
                <th>Driver</th>
                <th>Assigned Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th>Actions</th></template
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
                  <button
                    v-if="r.profile_photo"
                    type="button"
                    class="table-action"
                    @click="viewDriverFile(r, 'driver')"
                  >
                    <Eye />View
                  </button>
                  <span v-else>—</span>
                </td>
                <td>
                  <button
                    v-if="r.license_photo"
                    type="button"
                    class="table-action"
                    @click="viewDriverFile(r, 'license')"
                  >
                    <Eye />View
                  </button>
                  <span v-else>—</span>
                </td>
                <td>
                  <StatusBadge :status="r.status" />
                </td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-btn"
                      title="View driver"
                      @click="viewing = r"
                    >
                      <Eye />
                    </button>
                    <button
                      v-if="auth.can('drivers.update')"
                      class="icon-btn"
                      title="Edit driver"
                      @click="open(r)"
                    >
                      <Pencil />
                    </button>
                  </div></td></template
              ><template v-else
                ><td>
                  <strong>{{ r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : `Vehicle #${r.vehicle_id}` }}</strong>
                  <small class="cell-small">{{ r.vehicle?.plate_number }}</small>
                </td>
                <td>
                  <strong>{{ r.driver?.name || `Driver #${r.driver_id}` }}</strong>
                  <small class="cell-small">{{ r.driver?.employee_number }}</small>
                </td>
                <td>
                  {{ formatDate(r.assigned_at) }}
                </td>
                <td>
                  {{ formatDate(r.returned_at) }}
                </td>
                <td><StatusBadge :status="r.status" /></td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-btn"
                      title="View assignment"
                      aria-label="View assignment"
                      @click="viewing = r"
                    >
                      <Eye />
                    </button>
                    <button
                      v-if="auth.can('assignments.update')"
                      class="icon-btn"
                      title="Edit assignment"
                      aria-label="Edit assignment"
                      @click="open(r)"
                    >
                      <Pencil />
                    </button>
                  </div>
                </td
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
      <form
        class="modal small-modal"
        :class="{
          'driver-form-modal': resource === 'drivers',
          'assignment-form-modal': resource === 'assignments',
        }"
        @submit.prevent="save"
      >
        <div class="modal-head">
          <div>
            <h2>
              {{ editing ? "Edit" : "Add" }}
              {{ resource === "drivers" ? "driver" : "assignment" }}
            </h2>
            <p>Enter the details below.</p>
          </div>
          <button type="button" class="icon-btn" @click="modal = false">
            <X />
          </button>
        </div>
        <div v-if="formError" class="alert error modal-form-error">
          {{ formError }}
        </div>
        <div class="dynamic-form">
          <label v-for="(_, key) in form" :key="key"
            ><span class="dynamic-field-label">
              {{ fieldLabel(String(key)) }}
              <button
                v-if="fieldHelp(String(key))"
                type="button"
                class="field-help-button"
                :aria-label="`Explain ${fieldLabel(String(key))}`"
              >
                <CircleHelp />
                <span class="field-help-tooltip" role="tooltip">
                  <strong
                    :class="
                      fieldHelp(String(key))?.optional
                        ? 'field-optionality optional'
                        : 'field-optionality required'
                    "
                    >{{
                      fieldHelp(String(key))?.optional ? "Optional" : "Required"
                    }}</strong
                  >
                  {{ fieldHelp(String(key))?.text }}
                </span>
              </button>
            </span>
            <SearchableSelect
              v-if="key === 'vehicle_id'"
              v-model="form[key]"
              :options="vehicleOptions"
              placeholder="Select a vehicle"
            />
            <SearchableSelect
              v-else-if="key === 'driver_id'"
              v-model="form[key]"
              :options="driverOptions"
              placeholder="Select a driver"
            />
            <select v-else-if="key === 'status'" v-model="form[key]">
              <option>active</option>
              <option v-if="resource === 'drivers'">inactive</option>
              <option v-if="resource !== 'drivers'">completed</option>
              <option v-if="resource !== 'drivers'">cancelled</option></select
            ><textarea
              v-else-if="key === 'notes'"
              v-model="form[key]"
            ></textarea
            ><input
              v-else-if="key === 'driver_photo' || key === 'license_photo'"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              @change="selectDriverFile(String(key), $event)"
            /><input
              v-else
              v-model="form[key]"
              :type="
                String(key).includes('date') || String(key).includes('at')
                  ? 'date'
                  : 'text'
              "
            />
            <small v-if="formErrors[String(key)]" class="field-error">
              {{ formErrors[String(key)][0] }}
            </small>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modal = false">
            Cancel</button
          ><button class="btn btn-primary" :disabled="saving">Save</button>
        </div>
      </form>
    </div>
    <div v-if="viewing" class="modal-backdrop" @click.self="viewing = null">
      <section class="modal driver-view-modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h2>{{ resource === "drivers" ? viewing.name : "Assignment details" }}</h2>
            <p v-if="resource === 'drivers'">{{ viewing.employee_number }}</p>
            <p v-else>{{ viewing.vehicle ? `${viewing.vehicle.brand} ${viewing.vehicle.model}` : `Vehicle #${viewing.vehicle_id}` }}</p>
          </div>
          <button class="icon-btn" type="button" @click="viewing = null">
            <X />
          </button>
        </div>
        <div v-if="resource === 'drivers'" class="driver-view-grid">
          <div>
            <small>Email</small><strong>{{ viewing.email || "—" }}</strong>
          </div>
          <div>
            <small>Phone</small><strong>{{ viewing.phone || "—" }}</strong>
          </div>
          <div>
            <small>License number</small
            ><strong>{{ viewing.license_number || "—" }}</strong>
          </div>
          <div>
            <small>License type</small
            ><strong>{{ viewing.license_type || "—" }}</strong>
          </div>
          <div>
            <small>License expiration</small
            ><strong>{{ formatDate(viewing.license_expiration) }}</strong>
          </div>
          <div>
            <small>Status</small><StatusBadge :status="viewing.status" />
          </div>
        </div>
        <div v-else class="driver-view-grid assignment-view-grid">
          <div>
            <small>Vehicle</small>
            <strong>{{ viewing.vehicle ? `${viewing.vehicle.brand} ${viewing.vehicle.model}` : `Vehicle #${viewing.vehicle_id}` }}</strong>
            <span>{{ viewing.vehicle?.plate_number || "—" }}</span>
          </div>
          <div>
            <small>Driver</small>
            <strong>{{ viewing.driver?.name || `Driver #${viewing.driver_id}` }}</strong>
            <span>{{ viewing.driver?.employee_number || "—" }}</span>
          </div>
          <div><small>Assigned</small><strong>{{ formatDate(viewing.assigned_at) }}</strong></div>
          <div><small>Returned</small><strong>{{ formatDate(viewing.returned_at) }}</strong></div>
          <div><small>Status</small><StatusBadge :status="viewing.status" /></div>
          <div class="assignment-view-notes"><small>Notes</small><strong>{{ viewing.notes || "—" }}</strong></div>
        </div>
        <div v-if="resource === 'drivers'" class="driver-view-photos">
          <button
            v-if="viewing.profile_photo"
            class="btn"
            type="button"
            @click="viewDriverFile(viewing, 'driver')"
          >
            <Eye />View driver photo
          </button>
          <button
            v-if="viewing.license_photo"
            class="btn"
            type="button"
            @click="viewDriverFile(viewing, 'license')"
          >
            <Eye />View license photo
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn" type="button" @click="viewing = null">
            Close
          </button>
        </div>
      </section>
    </div>
    <div
      v-if="photoPreviewOpen"
      class="modal-backdrop photo-preview-backdrop"
      @click.self="closePhotoPreview"
    >
      <section
        class="modal driver-photo-preview-modal"
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-head">
          <div>
            <h2>Photo preview</h2>
            <p>{{ photoPreviewName }}</p>
          </div>
          <div class="modal-head-actions">
            <button class="btn" type="button" @click="downloadPhoto">
              <Download />Download
            </button>
            <button
              class="icon-btn"
              type="button"
              aria-label="Close"
              @click="closePhotoPreview"
            >
              <X />
            </button>
          </div>
        </div>
        <div class="driver-photo-preview-body">
          <img :src="photoPreviewUrl" alt="Driver document preview" />
        </div>
      </section>
    </div>
  </div>
</template>
