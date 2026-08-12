<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import {
  ArrowLeft,
  CarFront,
  Gauge,
  Wrench,
  FileText,
  Download,
  Pencil,
  Trash2,
  X,
} from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../api/client";
import { useAuthStore } from "../../stores/auth";
import type { ApiEnvelope, PaginationMeta, Vehicle } from "../../types";
import LoadingState from "../../components/LoadingState.vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import VehicleRecordsSection from "../../components/vehicles/VehicleRecordsSection.vue";
import VehicleEditModal from "../../components/vehicles/VehicleEditModal.vue";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal.vue";
import { formatDate } from "../../utils/date";
import {
  vehicleCodeOptions,
  vehicleDetailTabs as tabs,
} from "./vehicleDetail.config";
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  vehicle = ref<Vehicle>(),
  loading = ref(true),
  tab = ref("overview"),
  rows = ref<any[]>([]),
  rowsMeta = ref<PaginationMeta>(),
  rowsPage = ref(1),
  rowsPerPage = ref(20),
  rowsLoading = ref(false),
  modal = ref(false),
  editModal = ref(false),
  vehicleDeleteOpen = ref(false),
  error = ref(""),
  saving = ref(false),
  editSaving = ref(false),
  deletingVehicle = ref(false),
  editErrors = ref<Record<string, string[]>>({});
const editingRow = ref<any | null>(null);
const deletingId = ref<number | null>(null);
const pendingDelete = ref<any | null>(null);
const viewingMaintenance = ref<any | null>(null);
const assignees = ref<Array<{ id: number; name: string; role: string }>>([]);
const photoPreviewUrl = ref("");
const photoPreviewOpen = ref(false);
const photoPreviewName = ref("odometer-photo.jpg");
const currentPhotoUrl = ref("");
const currentPhotoLoading = ref(false);
const documentFile = ref<File | null>(null);
const mileagePhoto = ref<File | null>(null);
const mileageOverride = ref(false);
const editCodePrefix = ref("");
const editCodeNumber = ref("");
const visibleTabs = computed(() =>
  tabs.filter(([key]) => key === "overview" || auth.can(`${key}.view`)),
);
const form = reactive<Record<string, any>>({});
const editForm = reactive<Record<string, any>>({});
const nextPms = computed(() => vehicle.value?.schedules?.[0] as any);
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const remaining = computed(() =>
  nextPms.value?.next_service_mileage
    ? nextPms.value.next_service_mileage - (vehicle.value?.current_mileage || 0)
    : null,
);
/** Load the vehicle and its overview relationships. */
async function loadVehicle() {
  try {
    const { data } = await api.get<ApiEnvelope<Vehicle>>(
      `/vehicles/${route.params.id}`,
    );
    vehicle.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
/** Load the selected operation tab with server-side pagination. */
async function loadTab() {
  if (tab.value === "overview") return;
  rowsLoading.value = true;
  try {
    if (tab.value === "issues" && !assignees.value.length) {
      const { data } =
        await api.get<ApiEnvelope<typeof assignees.value>>("/assignees");
      assignees.value = data.data;
    }
    const path =
      tab.value === "maintenance" || tab.value === "mileage"
        ? tab.value
        : tab.value;
    const { data } = await api.get<ApiEnvelope<any[]>>(
      `/vehicles/${route.params.id}/${path}`,
      { params: { page: rowsPage.value, per_page: rowsPerPage.value } },
    );
    rows.value = data.data;
    rowsMeta.value = data.meta;
  } finally {
    rowsLoading.value = false;
  }
}
watch(tab, () => {
  rowsPage.value = 1;
  loadTab();
});
watch(rowsPage, loadTab);
watch(rowsPerPage, () => {
  rowsPage.value = 1;
  loadTab();
});
onMounted(loadVehicle);
/** Populate and open the vehicle edit form. */
function openEdit() {
  if (!vehicle.value) return;
  editErrors.value = {};
  const currentCode = vehicle.value.vehicle_code || "";
  const codeOption = vehicleCodeOptions.find((item) =>
    currentCode.startsWith(item.prefix),
  );
  editCodePrefix.value = codeOption?.prefix || "";
  editCodeNumber.value = codeOption
    ? currentCode.slice(codeOption.prefix.length)
    : currentCode;
  Object.assign(editForm, {
    plate_number: vehicle.value.plate_number,
    vehicle_code: vehicle.value.vehicle_code || "",
    brand: vehicle.value.brand,
    model: vehicle.value.model,
    variant: vehicle.value.variant || "",
    year: vehicle.value.year || "",
    vehicle_type: vehicle.value.vehicle_type,
    color: vehicle.value.color || "",
    acquisition_date: vehicle.value.acquisition_date?.slice(0, 10) || "",
    acquisition_cost: vehicle.value.acquisition_cost || "",
    status: vehicle.value.status,
    notes: vehicle.value.notes || "",
    current_mileage: vehicle.value.current_mileage,
  });
  editModal.value = true;
}
/** Persist vehicle changes and refresh the overview. */
async function saveEdit() {
  editSaving.value = true;
  editErrors.value = {};
  error.value = "";
  try {
    const vehicleCode = editCodePrefix.value
      ? `${editCodePrefix.value}${editCodeNumber.value.trim().toUpperCase()}`
      : editCodeNumber.value.trim().toUpperCase();
    const { current_mileage: _currentMileage, ...payload } = editForm;
    await api.put(`/vehicles/${route.params.id}`, {
      ...payload,
      vehicle_code: vehicleCode,
    });
    editModal.value = false;
    await loadVehicle();
  } catch (e) {
    error.value = errorMessage(e);
    editErrors.value = validationErrors(e);
  } finally {
    editSaving.value = false;
  }
}
/** Delete the vehicle after explicit confirmation. */
async function deleteVehicle() {
  if (!vehicle.value) return;
  deletingVehicle.value = true;
  error.value = "";
  try {
    await api.delete(`/vehicles/${vehicle.value.id}`);
    vehicleDeleteOpen.value = false;
    await router.push("/vehicles");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    deletingVehicle.value = false;
  }
}
/** Keep the editable vehicle code aligned with its selected prefix. */
function selectEditCodePrefix() {
  const option = vehicleCodeOptions.find(
    (item) => item.prefix === editCodePrefix.value,
  );
  if (option) editForm.vehicle_type = option.type;
}
/** Apply the default code prefix associated with a vehicle type. */
function selectEditVehicleType() {
  const option = vehicleCodeOptions.find(
    (item) => item.type === editForm.vehicle_type,
  );
  if (option) editCodePrefix.value = option.prefix;
}
/** Return resource-specific defaults for a new record form. */
function formDefaults() {
  return {
    mileage: { mileage: vehicle.value?.current_mileage || 0, notes: "" },
    maintenance: {
      service_date: new Date().toISOString().slice(0, 10),
      mileage: vehicle.value?.current_mileage || 0,
      maintenance_type: "General PMS",
      service_provider: "",
      labor_cost: 0,
      parts_cost: 0,
      other_cost: 0,
    },
    expenses: {
      category: "Fuel",
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      vendor: "",
      description: "",
    },
    documents: {
      document_type: "Registration",
      expiration_date: "",
      document_number: "",
    },
    issues: {
      title: "",
      description: "",
      category: "Other",
      priority: "medium",
      assigned_to: "",
    },
    fuel: {
      fuel_date: new Date().toISOString().slice(0, 10),
      mileage: vehicle.value?.current_mileage || 0,
      liters: 0,
      price_per_liter: 0,
    },
    schedules: {
      maintenance_type: "General PMS",
      interval_type: "both",
      interval_km: 5000,
      interval_months: 6,
      reminder_km: 2000,
      reminder_days: 30,
    },
  } as Record<string, Record<string, any>>;
}
/** Clear transient form and file state before opening a record editor. */
function resetRecordForm() {
  clearCurrentPhoto();
  documentFile.value = null;
  mileagePhoto.value = null;
  mileageOverride.value = false;
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, formDefaults()[tab.value]);
}
/** Open a clean form for the active vehicle resource. */
function openForm() {
  editingRow.value = null;
  resetRecordForm();
  modal.value = true;
}
/** Load a resource record into the shared editor. */
async function editRecord(row: any) {
  editingRow.value = row;
  resetRecordForm();
  Object.keys(form).forEach((key) => {
    if (row[key] !== null && row[key] !== undefined) {
      form[key] = String(key).includes("date")
        ? String(row[key]).slice(0, 10)
        : row[key];
    }
  });
  modal.value = true;
  if (tab.value === "mileage") {
    mileageOverride.value = Boolean(row.is_override);
  }
  if (tab.value === "mileage" && row.photo) {
    currentPhotoLoading.value = true;
    try {
      const response = await api.get(`/mileage/${row.id}/photo`, {
        responseType: "blob",
      });
      currentPhotoUrl.value = URL.createObjectURL(response.data);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      currentPhotoLoading.value = false;
    }
  }
}
/** Create or update the active vehicle resource record. */
async function save() {
  saving.value = true;
  try {
    let payload: Record<string, any> | FormData = form;
    if (tab.value === "documents" || tab.value === "mileage") {
      const multipart = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== "")
          multipart.append(key, String(value));
      });
      if (documentFile.value) multipart.append("file", documentFile.value);
      if (mileagePhoto.value) multipart.append("photo", mileagePhoto.value);
      if (tab.value === "mileage" && auth.can("mileage.override")) {
        multipart.append("override", mileageOverride.value ? "1" : "0");
      }
      if (editingRow.value) multipart.append("_method", "PUT");
      payload = multipart;
    }
    const endpoint = `/vehicles/${route.params.id}/${tab.value}${editingRow.value ? `/${editingRow.value.id}` : ""}`;
    if (editingRow.value && !(payload instanceof FormData)) {
      await api.put(endpoint, payload);
    } else {
      await api.post(endpoint, payload);
    }
    modal.value = false;
    await Promise.all([loadVehicle(), loadTab()]);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
/** Stage a record for deletion confirmation. */
function requestDelete(row: any) {
  pendingDelete.value = row;
}
/** Delete the staged record and reload its current page. */
async function deleteRecord() {
  const row = pendingDelete.value;
  if (!row) return;
  deletingId.value = row.id;
  error.value = "";
  try {
    await api.delete(`/vehicles/${route.params.id}/${tab.value}/${row.id}`);
    pendingDelete.value = null;
    await Promise.all([loadVehicle(), loadTab()]);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    deletingId.value = null;
  }
}
/** Store the selected document until the record is submitted. */
function selectDocumentFile(event: Event) {
  documentFile.value = (event.target as HTMLInputElement).files?.[0] || null;
}
/** Store and preview the selected odometer image. */
function selectMileagePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  mileagePhoto.value = file;
  if (file) {
    clearCurrentPhoto();
    currentPhotoUrl.value = URL.createObjectURL(file);
  }
}
/** Download a private vehicle document through the authenticated API. */
async function downloadDocument(row: any) {
  const response = await api.get(`/documents/${row.id}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = row.file_path?.split("/").pop() || "vehicle-document";
  link.click();
  URL.revokeObjectURL(url);
}
/** Load a protected mileage photo into the preview modal. */
async function downloadMileagePhoto(row: any) {
  const response = await api.get(`/mileage/${row.id}/photo`, {
    responseType: "blob",
  });
  closePhotoPreview();
  photoPreviewUrl.value = URL.createObjectURL(response.data);
  photoPreviewName.value = row.photo?.split("/").pop() || "odometer-photo.jpg";
  photoPreviewOpen.value = true;
}
/** Save the currently previewed mileage image locally. */
function downloadPreviewPhoto() {
  if (!photoPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = photoPreviewUrl.value;
  link.download = photoPreviewName.value;
  link.click();
}
/** Close the image preview and release its object URL. */
function closePhotoPreview() {
  photoPreviewOpen.value = false;
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
    photoPreviewUrl.value = "";
  }
}
/** Remove a pending replacement photo from the form. */
function clearCurrentPhoto() {
  if (currentPhotoUrl.value) {
    URL.revokeObjectURL(currentPhotoUrl.value);
    currentPhotoUrl.value = "";
  }
  currentPhotoLoading.value = false;
}
onBeforeUnmount(() => {
  closePhotoPreview();
  clearCurrentPhoto();
});
/** Return the safe, resource-specific columns rendered in the record table. */
function columns(row: any) {
  if (tab.value === "mileage") {
    return [
      "recorded_by_name",
      "mileage",
      "recorded_at",
      "photo",
      "is_override",
    ];
  }
  if (tab.value === "maintenance") {
    return [
      "record_id",
      "performed_by_name",
      "service_provider",
      "service_date",
      "mileage",
      "maintenance_type",
    ];
  }
  if (tab.value === "issues") {
    return [
      "reported_by_name",
      "assigned_to_name",
      "title",
      "priority",
      "category",
      "status",
    ];
  }
  return Object.keys(row)
    .filter(
      (k) =>
        ![
          "id",
          "business_id",
          "vehicle_id",
          "created_at",
          "updated_at",
          "deleted_at",
          "notes",
          "description",
        ].includes(k),
    )
    .slice(0, 6);
}
/** Resolve derived relation values used by table cells. */
function cellValue(row: any, column: string) {
  if (column === "record_id") return `#${row.id}`;
  if (column === "performed_by_name") return row.performer?.name || "—";
  if (column === "service_provider")
    return row.service_provider || "Not specified";
  if (column === "recorded_by_name") return row.recorder?.name || "—";
  if (column === "reported_by_name") return row.reporter?.name || "—";
  if (column === "assigned_to_name") return row.assignee?.name || "Unassigned";
  return row[column];
}
/** Format nullable scalar table values for display. */
function pretty(v: any) {
  if (v === null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(v))
    return formatDate(v);
  return String(v).replaceAll("_", " ");
}
</script>
<template>
  <div>
    <RouterLink to="/vehicles" class="back-link"
      ><ArrowLeft />Back to vehicles</RouterLink
    >
    <div class="alert error" v-if="error">{{ error }}</div>
    <LoadingState v-if="loading" /><template v-else-if="vehicle"
      ><header class="vehicle-hero">
        <div class="vehicle-avatar"><CarFront /></div>
        <div>
          <div class="title-line">
            <h1>{{ vehicle.brand }} {{ vehicle.model }}</h1>
            <StatusBadge :status="vehicle.status" />
          </div>
          <p>
            <span class="mono">{{ vehicle.plate_number }}</span> ·
            {{ vehicle.vehicle_type }} ·
            {{ vehicle.year || "Year not set" }}
          </p>
        </div>
        <div class="vehicle-hero-actions">
          <button
            v-if="auth.can('vehicles.update')"
            class="btn"
            @click="openEdit"
          >
            <Pencil :size="16" />Edit vehicle
          </button>
          <button
            v-if="auth.can('vehicles.delete')"
            class="btn btn-danger-outline"
            @click="vehicleDeleteOpen = true"
          >
            <Trash2 :size="16" />Delete vehicle
          </button>
        </div>
      </header>
      <nav class="tabs">
        <button
          v-for="t in visibleTabs"
          :key="t[0]"
          :class="{ active: tab === t[0] }"
          @click="tab = t[0]"
        >
          {{ t[1] }}
        </button>
      </nav>
      <section v-if="tab === 'overview'">
        <div class="detail-metrics">
          <button v-if="auth.can('mileage.view')" type="button" @click="tab = 'mileage'">
            <span><Gauge /></span><small>CURRENT MILEAGE</small
            ><strong
              >{{ Number(vehicle.current_mileage).toLocaleString() }} km</strong
            >
          </button>
          <button v-if="auth.can('schedules.view')" type="button" @click="tab = 'schedules'">
            <span><Wrench /></span><small>NEXT PMS</small
            ><strong>{{
              nextPms?.next_service_mileage
                ? Number(nextPms.next_service_mileage).toLocaleString() + " km"
                : "Not scheduled"
            }}</strong>
            <p v-if="remaining !== null" :class="{ danger: remaining < 0 }">
              {{
                remaining < 0
                  ? `${Math.abs(remaining)} km overdue`
                  : `${remaining.toLocaleString()} km remaining`
              }}
            </p>
          </button>
          <button v-if="auth.can('documents.view')" type="button" @click="tab = 'documents'">
            <span><FileText /></span><small>DOCUMENTS</small
            ><strong>{{ vehicle.documents?.length || 0 }} on file</strong>
          </button>
        </div>
        <div class="detail-grid">
          <article class="card">
            <div class="card-head">
              <div>
                <h2>Vehicle information</h2>
                <p>Core identification and acquisition details</p>
              </div>
            </div>
            <dl class="info-list">
              <div>
                <dt>Vehicle code</dt>
                <dd>{{ vehicle.vehicle_code || "—" }}</dd>
              </div>
              <div>
                <dt>Vehicle type</dt>
                <dd>{{ vehicle.vehicle_type }}</dd>
              </div>
              <div>
                <dt>Variant</dt>
                <dd>{{ vehicle.variant || "—" }}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>{{ vehicle.color || "—" }}</dd>
              </div>
              <div>
                <dt>Purchased date</dt>
                <dd>{{ formatDate(vehicle.acquisition_date) }}</dd>
              </div>
              <div>
                <dt>Vehicle cost</dt>
                <dd>
                  {{
                    vehicle.acquisition_cost
                      ? `₱${Number(vehicle.acquisition_cost).toLocaleString()}`
                      : "—"
                  }}
                </dd>
              </div>
            </dl>
          </article>
          <article class="card">
            <div class="card-head">
              <div>
                <h2>Upcoming attention</h2>
                <p>Maintenance and document deadlines</p>
              </div>
            </div>
            <button
              v-if="nextPms && auth.can('schedules.view')"
              type="button"
              class="attention attention-link"
              @click="tab = 'schedules'"
            >
              <span class="metric-icon amber"><Wrench /></span>
              <div>
                <strong>{{ nextPms.maintenance_type }}</strong>
                <p>
                  {{
                    nextPms.next_service_date
                      ? formatDate(nextPms.next_service_date)
                      : "Mileage based schedule"
                  }}
                </p>
              </div>
            </button>
            <EmptyState
              v-else
              title="Everything looks clear"
              message="No upcoming maintenance or document deadlines."
            />
          </article>
        </div>
      </section>
      <VehicleRecordsSection
        v-else
        :title="tabs.find((item) => item[0] === tab)?.[1] || tab"
        :resource="tab"
        :rows="rows"
        :loading="rowsLoading"
        :meta="rowsMeta"
        v-model:page="rowsPage"
        v-model:per-page="rowsPerPage"
        :can-create="auth.can(`${tab}.create`)"
        :can-update="auth.can(`${tab}.update`)"
        :can-delete="auth.can(`${tab}.delete`)"
        :deleting-id="deletingId"
        :columns="columns"
        :cell-value="cellValue"
        :display-value="pretty"
        @add="openForm"
        @edit="editRecord"
        @remove="requestDelete"
        @view-maintenance="viewingMaintenance = $event"
        @download-document="downloadDocument"
        @view-photo="downloadMileagePhoto"
      />
      <VehicleEditModal :open="editModal" :form="editForm" :errors="editErrors" :code-options="vehicleCodeOptions" v-model:code-prefix="editCodePrefix" v-model:code-number="editCodeNumber" :saving="editSaving" @close="editModal = false" @save="saveEdit" @select-code-prefix="selectEditCodePrefix" @select-vehicle-type="selectEditVehicleType" />
      <div class="modal-backdrop" v-if="modal" @click.self="modal = false">
        <form class="modal small-modal" @submit.prevent="save">
          <div class="modal-head">
            <div>
              <h2>{{ editingRow ? "Edit" : "Add" }} {{ tab }} record</h2>
              <p>
                {{ editingRow ? "Update" : "Save" }} this record for
                {{ vehicle.brand }} {{ vehicle.model }}.
              </p>
            </div>
            <button type="button" class="icon-btn" @click="modal = false">
              <X />
            </button>
          </div>
          <div class="dynamic-form">
            <label v-if="tab === 'issues'"
              >Reported by<input
                :value="editingRow?.reporter?.name || auth.user?.name"
                disabled
            /></label>
            <label v-for="(_, key) in form" :key="key"
              >{{ String(key).replaceAll("_", " ")
              }}<textarea
                v-if="['notes', 'description'].includes(String(key))"
                v-model="form[key]"
              ></textarea
              ><select v-else-if="key === 'priority'" v-model="form[key]">
                <option>low</option>
                <option>medium</option>
                <option>high</option>
                <option>critical</option></select
              ><select v-else-if="key === 'assigned_to'" v-model="form[key]">
                <option value="">Unassigned</option>
                <option
                  v-for="person in assignees"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.name }} ({{ person.role.replaceAll("_", " ") }})
                </option></select
              ><input
                v-else
                v-model="form[key]"
                :type="
                  String(key).includes('date')
                    ? 'date'
                    : typeof form[key] === 'number'
                      ? 'number'
                      : 'text'
                "
            /></label>
            <label v-if="tab === 'documents'" class="file-picker">
              Attachment
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                @change="selectDocumentFile"
              />
              <small>PDF, JPG or PNG up to 10 MB</small>
            </label>
            <label v-if="tab === 'mileage'" class="file-picker">
              Odometer photo
              <div
                v-if="currentPhotoLoading || currentPhotoUrl"
                class="current-photo-preview"
              >
                <span v-if="currentPhotoLoading">Loading current photo…</span>
                <img
                  v-else-if="currentPhotoUrl"
                  :src="currentPhotoUrl"
                  alt="Current odometer photo"
                />
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                capture="environment"
                @change="selectMileagePhoto"
              />
              <small>JPG or PNG up to 10 MB</small>
            </label>
            <label
              v-if="tab === 'mileage' && auth.can('mileage.override')"
              class="mileage-override"
            >
              <span>
                <input
                  v-model="mileageOverride"
                  type="checkbox"
                  :disabled="Boolean(editingRow?.is_override)"
                />
                Allow mileage override
              </span>
              <small>
                Use only for an odometer replacement or a verified correction.
                This action is recorded in the audit log.
              </small>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="modal = false">
              Cancel</button
            ><button class="btn btn-primary" :disabled="saving">
              {{
                saving ? "Saving…" : editingRow ? "Save changes" : "Save record"
              }}
            </button>
          </div>
        </form>
      </div>
      <div
        v-if="photoPreviewOpen"
        class="modal-backdrop photo-preview-backdrop"
        @click.self="closePhotoPreview"
      >
        <div class="photo-preview-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <div>
              <h2>Odometer photo</h2>
              <p>Uploaded mileage evidence</p>
            </div>
            <div class="modal-head-actions">
              <button type="button" class="btn" @click="downloadPreviewPhoto">
                <Download />Download
              </button>
              <button type="button" class="icon-btn" @click="closePhotoPreview">
                <X />
              </button>
            </div>
          </div>
          <div class="photo-preview-body">
            <img :src="photoPreviewUrl" alt="Odometer mileage evidence" />
          </div>
        </div>
      </div>
      <div
        v-if="viewingMaintenance"
        class="modal-backdrop"
        @click.self="viewingMaintenance = null"
      >
        <section
          class="modal maintenance-detail-modal"
          role="dialog"
          aria-modal="true"
        >
          <div class="modal-head">
            <div>
              <h2>Maintenance record #{{ viewingMaintenance.id }}</h2>
              <p>Complete service and cost information</p>
            </div>
            <button
              type="button"
              class="icon-btn"
              aria-label="Close"
              @click="viewingMaintenance = null"
            >
              <X />
            </button>
          </div>
          <dl class="maintenance-detail-list">
            <div>
              <dt>Maintenance type</dt>
              <dd>{{ viewingMaintenance.maintenance_type }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ pretty(viewingMaintenance.status) }}</dd>
            </div>
            <div>
              <dt>Service date</dt>
              <dd>{{ formatDate(viewingMaintenance.service_date) }}</dd>
            </div>
            <div>
              <dt>Mileage</dt>
              <dd>
                {{ Number(viewingMaintenance.mileage).toLocaleString() }} km
              </dd>
            </div>
            <div>
              <dt>Performed by</dt>
              <dd>{{ viewingMaintenance.performer?.name || "—" }}</dd>
            </div>
            <div>
              <dt>Service provider</dt>
              <dd>
                {{ viewingMaintenance.service_provider || "Not specified" }}
              </dd>
            </div>
            <div>
              <dt>PMS schedule</dt>
              <dd>
                {{
                  viewingMaintenance.maintenance_schedule?.maintenance_type ||
                  "Not linked"
                }}
              </dd>
            </div>
            <div>
              <dt>Next service date</dt>
              <dd>{{ formatDate(viewingMaintenance.next_service_date) }}</dd>
            </div>
            <div>
              <dt>Next service mileage</dt>
              <dd>
                {{
                  viewingMaintenance.next_service_mileage
                    ? `${Number(viewingMaintenance.next_service_mileage).toLocaleString()} km`
                    : "—"
                }}
              </dd>
            </div>
            <div>
              <dt>Labor cost</dt>
              <dd>
                {{ money.format(Number(viewingMaintenance.labor_cost || 0)) }}
              </dd>
            </div>
            <div>
              <dt>Parts cost</dt>
              <dd>
                {{ money.format(Number(viewingMaintenance.parts_cost || 0)) }}
              </dd>
            </div>
            <div>
              <dt>Other cost</dt>
              <dd>
                {{ money.format(Number(viewingMaintenance.other_cost || 0)) }}
              </dd>
            </div>
            <div class="maintenance-total">
              <dt>Total cost</dt>
              <dd>
                {{ money.format(Number(viewingMaintenance.total_cost || 0)) }}
              </dd>
            </div>
            <div class="full">
              <dt>Description</dt>
              <dd>{{ viewingMaintenance.description || "—" }}</dd>
            </div>
            <div class="full">
              <dt>Notes</dt>
              <dd>{{ viewingMaintenance.notes || "—" }}</dd>
            </div>
          </dl>
          <div
            v-if="viewingMaintenance.parts?.length"
            class="maintenance-parts"
          >
            <h3>Parts used</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Part number</th>
                    <th>Quantity</th>
                    <th>Unit cost</th>
                    <th>Total</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="part in viewingMaintenance.parts" :key="part.id">
                    <td>{{ part.part_name }}</td>
                    <td>{{ part.part_number || "—" }}</td>
                    <td>{{ part.quantity }}</td>
                    <td>{{ money.format(Number(part.unit_cost)) }}</td>
                    <td>{{ money.format(Number(part.total_cost)) }}</td>
                    <td>{{ part.supplier || "—" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn"
              @click="viewingMaintenance = null"
            >
              Close
            </button>
          </div>
        </section>
      </div>
      <ConfirmDeleteModal
        :open="vehicleDeleteOpen"
        :loading="deletingVehicle"
        title="Delete vehicle?"
        :message="`${vehicle.brand} ${vehicle.model} (${vehicle.plate_number}) will be removed from the active fleet.`"
        @cancel="vehicleDeleteOpen = false"
        @confirm="deleteVehicle"
      />
      <ConfirmDeleteModal
        :open="!!pendingDelete"
        :loading="deletingId !== null"
        :title="`Delete ${tabs.find((item) => item[0] === tab)?.[1] || 'record'} record?`"
        message="This record will be permanently removed. This action cannot be undone."
        @cancel="pendingDelete = null"
        @confirm="deleteRecord"
    /></template>
  </div>
</template>
