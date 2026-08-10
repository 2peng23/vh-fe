<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, RouterLink } from "vue-router";
import {
  ArrowLeft,
  CarFront,
  Gauge,
  Wrench,
  FileText,
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../api/client";
import { useAuthStore } from "../../stores/auth";
import type { ApiEnvelope, PaginationMeta, Vehicle } from "../../types";
import LoadingState from "../../components/LoadingState.vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import PaginationControls from "../../components/PaginationControls.vue";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal.vue";
import { formatDate } from "../../utils/date";
const route = useRoute(),
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
  error = ref(""),
  saving = ref(false),
  editSaving = ref(false),
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
const vehicleCodeOptions = [
  { prefix: "TRK-", type: "Truck", label: "TRK- — Truck" },
  { prefix: "VAN-", type: "Van", label: "VAN- — Van" },
  { prefix: "CAR-", type: "Car", label: "CAR- — Car" },
  { prefix: "BUS-", type: "Bus", label: "BUS- — Bus" },
  { prefix: "PUP-", type: "Pickup", label: "PUP- — Pickup" },
  { prefix: "MC-", type: "Motorcycle", label: "MC- — Motorcycle" },
  { prefix: "SUV-", type: "SUV", label: "SUV- — SUV" },
  {
    prefix: "HEQ-",
    type: "Heavy Equipment",
    label: "HEQ- — Heavy Equipment",
  },
  { prefix: "OTH-", type: "Other", label: "OTH- — Other" },
];
const tabs = [
  ["overview", "Overview"],
  ["mileage", "Mileage"],
  ["maintenance", "Maintenance"],
  ["schedules", "PMS schedules"],
  ["expenses", "Expenses"],
  ["documents", "Documents"],
  ["issues", "Issues"],
  ["fuel", "Fuel"],
];
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
function selectEditCodePrefix() {
  const option = vehicleCodeOptions.find(
    (item) => item.prefix === editCodePrefix.value,
  );
  if (option) editForm.vehicle_type = option.type;
}
function selectEditVehicleType() {
  const option = vehicleCodeOptions.find(
    (item) => item.type === editForm.vehicle_type,
  );
  if (option) editCodePrefix.value = option.prefix;
}
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
function resetRecordForm() {
  clearCurrentPhoto();
  documentFile.value = null;
  mileagePhoto.value = null;
  mileageOverride.value = false;
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, formDefaults()[tab.value]);
}
function openForm() {
  editingRow.value = null;
  resetRecordForm();
  modal.value = true;
}
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
function requestDelete(row: any) {
  pendingDelete.value = row;
}
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
function selectDocumentFile(event: Event) {
  documentFile.value = (event.target as HTMLInputElement).files?.[0] || null;
}
function selectMileagePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  mileagePhoto.value = file;
  if (file) {
    clearCurrentPhoto();
    currentPhotoUrl.value = URL.createObjectURL(file);
  }
}
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
async function downloadMileagePhoto(row: any) {
  const response = await api.get(`/mileage/${row.id}/photo`, {
    responseType: "blob",
  });
  closePhotoPreview();
  photoPreviewUrl.value = URL.createObjectURL(response.data);
  photoPreviewName.value = row.photo?.split("/").pop() || "odometer-photo.jpg";
  photoPreviewOpen.value = true;
}
function downloadPreviewPhoto() {
  if (!photoPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = photoPreviewUrl.value;
  link.download = photoPreviewName.value;
  link.click();
}
function closePhotoPreview() {
  photoPreviewOpen.value = false;
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
    photoPreviewUrl.value = "";
  }
}
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
        <button v-if="auth.can('vehicles.update')" class="btn" @click="openEdit">Edit vehicle</button>
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
      <section v-else>
        <div class="subpage-head">
          <div>
            <h2>{{ tabs.find((t) => t[0] === tab)?.[1] }}</h2>
            <p>Complete history for this vehicle.</p>
          </div>
          <button v-if="auth.can(`${tab}.create`)" class="btn btn-primary" @click="openForm">
            <Plus />Add record
          </button>
        </div>
        <LoadingState v-if="rowsLoading" /><EmptyState
          v-else-if="!rows.length"
          :title="`No ${tab} records`"
        />
        <div v-else class="card table-card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="c in columns(rows[0])" :key="c">
                    {{ c.replaceAll("_", " ") }}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id">
                  <td v-for="c in columns(r)" :key="c">
                    <button
                      v-if="c === 'file_path' && r[c]"
                      class="table-action"
                      @click="downloadDocument(r)"
                    >
                      <Download />Download
                    </button>
                    <button
                      v-else-if="c === 'photo' && r[c]"
                      class="table-action"
                      @click="downloadMileagePhoto(r)"
                    >
                      <Eye />View photo
                    </button>
                    <template v-else>{{ pretty(cellValue(r, c)) }}</template>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button
                        v-if="tab === 'maintenance'"
                        class="icon-btn"
                        title="View full information"
                        @click="viewingMaintenance = r"
                      >
                        <Eye />
                      </button>
                      <button
                        v-if="auth.can(`${tab}.update`)"
                        class="icon-btn"
                        title="Edit record"
                        @click="editRecord(r)"
                      >
                        <Pencil />
                      </button>
                      <button
                        v-if="auth.can(`${tab}.delete`)"
                        class="icon-btn danger"
                        title="Delete record"
                        :disabled="deletingId === r.id"
                        @click="requestDelete(r)"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <PaginationControls
            v-if="rowsMeta"
            :meta="rowsMeta"
            v-model:page="rowsPage"
            v-model:per-page="rowsPerPage"
          />
        </div>
      </section>
      <div
        class="modal-backdrop"
        v-if="editModal"
        @click.self="editModal = false"
      >
        <form class="modal" @submit.prevent="saveEdit">
          <div class="modal-head">
            <div>
              <h2>Edit vehicle</h2>
              <p>Update identification and vehicle information.</p>
            </div>
            <button type="button" class="icon-btn" @click="editModal = false">
              <X />
            </button>
          </div>
          <div class="field-grid">
            <label
              >Plate number<input
                v-model="editForm.plate_number"
                required
              /><small v-if="editErrors.plate_number">{{
                editErrors.plate_number[0]
              }}</small></label
            >
            <label
              >Vehicle code type<select
                v-model="editCodePrefix"
                @change="selectEditCodePrefix"
              >
                <option value="">Custom / legacy code</option>
                <option
                  v-for="option in vehicleCodeOptions"
                  :key="option.prefix"
                  :value="option.prefix"
                >
                  {{ option.label }}
                </option>
              </select></label
            >
            <label
              >Vehicle code number<input
                v-model="editCodeNumber"
                required
                maxlength="20"
                placeholder="Example: 0001"
              /><small v-if="editErrors.vehicle_code">{{
                editErrors.vehicle_code[0]
              }}</small></label
            >
            <label
              >Brand<input v-model="editForm.brand" required /><small
                v-if="editErrors.brand"
                >{{ editErrors.brand[0] }}</small
              ></label
            >
            <label
              >Model<input v-model="editForm.model" required /><small
                v-if="editErrors.model"
                >{{ editErrors.model[0] }}</small
              ></label
            >
            <label>Variant<input v-model="editForm.variant" /></label>
            <label
              >Year<input
                v-model.number="editForm.year"
                type="number"
                min="1900"
            /></label>
            <label
              >Vehicle type<select
                v-model="editForm.vehicle_type"
                required
                @change="selectEditVehicleType"
              >
                <option>Car</option>
                <option>Van</option>
                <option>Truck</option>
                <option>Pickup</option>
                <option>Motorcycle</option>
                <option>Bus</option>
                <option>SUV</option>
                <option>Heavy Equipment</option>
                <option>Other</option>
              </select></label
            >
            <label
              >Current mileage<input
                v-model.number="editForm.current_mileage"
                type="number"
                disabled
              /><small>Update mileage from the Mileage tab.</small></label
            >
            <label>Color<input v-model="editForm.color" /></label>
            <label
              >Purchased date<input
                v-model="editForm.acquisition_date"
                type="date"
            /></label>
            <label
              >Vehicle cost<input
                v-model.number="editForm.acquisition_cost"
                type="number"
                min="0"
                step="0.01"
            /></label>
            <label
              >Status<select v-model="editForm.status">
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
                <option value="disposed">Disposed</option>
              </select></label
            >
            <label class="full"
              >Notes<textarea v-model="editForm.notes"></textarea>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="editModal = false">
              Cancel
            </button>
            <button class="btn btn-primary" :disabled="editSaving">
              {{ editSaving ? "Saving…" : "Save changes" }}
            </button>
          </div>
        </form>
      </div>
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
        :open="!!pendingDelete"
        :loading="deletingId !== null"
        :title="`Delete ${tabs.find((item) => item[0] === tab)?.[1] || 'record'} record?`"
        message="This record will be permanently removed. This action cannot be undone."
        @cancel="pendingDelete = null"
        @confirm="deleteRecord"
    /></template>
  </div>
</template>
