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
  ReceiptText,
  Download,
  Pencil,
  X,
  CircleHelp,
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
import { formatDate, formatDateTime } from "../../utils/date";
import { vehicleDetailTabs as tabs } from "./vehicleDetail.config";
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
  maintenanceFilterOpenRequest = ref(0),
  expenseFilterOpenRequest = ref(0),
  fuelFilterOpenRequest = ref(0),
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
const viewingExpense = ref<any | null>(null);
const maintenanceSchedules = ref<any[]>([]);
const documentPreviewUrl = ref("");
const documentPreviewOpen = ref(false);
const documentPreviewName = ref("vehicle-document");
const documentPreviewType = ref("");
const photoPreviewUrl = ref("");
const photoPreviewOpen = ref(false);
const photoPreviewName = ref("odometer-photo.jpg");
const currentPhotoUrl = ref("");
const currentPhotoLoading = ref(false);
const documentFile = ref<File | null>(null);
const mileagePhoto = ref<File | null>(null);
const mileageOverride = ref(false);
const maintenanceRange = ref<"today" | "week" | "month" | "all" | null>("all");
const maintenanceSortBy = ref("service_date");
const maintenanceSortDirection = ref<"asc" | "desc">("desc");
const maintenanceFilters = reactive({
  recordId: "",
  from: "",
  to: "",
  performedBy: "",
  serviceProvider: "",
  maintenanceType: "",
});
const expenseRange = ref<"today" | "week" | "month" | "all" | null>("all");
const expenseSortBy = ref("expense_date");
const expenseSortDirection = ref<"asc" | "desc">("desc");
const expenseFilters = reactive({
  recordId: "",
  from: "",
  to: "",
  category: "",
  vendor: "",
  recordedBy: "",
});
const fuelRange = ref<"today" | "week" | "month" | "all" | null>("all");
const fuelSortBy = ref("fuel_date");
const fuelSortDirection = ref<"asc" | "desc">("desc");
const fuelFilters = reactive({ recordId: "", from: "", to: "", recordedBy: "" });
function numericAmount(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}
const pageAmountTotal = computed(() =>
  rows.value.reduce((total, row) => {
    if (tab.value === "maintenance") return total + numericAmount(row.total_cost);
    if (tab.value === "expenses") return total + numericAmount(row.amount);
    if (tab.value === "fuel") return total + numericAmount(row.total_amount);
    return total;
  }, 0),
);
const overallAmountTotal = computed(() =>
  rowsMeta.value?.total_amount == null
    ? pageAmountTotal.value
    : numericAmount(rowsMeta.value.total_amount),
);
const visibleTabs = computed(() =>
  tabs.filter(([key]) => key === "overview" || auth.can(`${key}.view`)),
);
const form = reactive<Record<string, any>>({});
const editForm = reactive<Record<string, any>>({});
const nextMaintenanceSchedule = computed(
  () => vehicle.value?.schedules?.[0] as any,
);
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
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
const remaining = computed(() =>
  nextMaintenanceSchedule.value?.next_service_mileage
    ? nextMaintenanceSchedule.value.next_service_mileage -
      (vehicle.value?.current_mileage || 0)
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
    const path =
      tab.value === "maintenance" || tab.value === "mileage"
        ? tab.value
        : tab.value;
    const { data } = await api.get<ApiEnvelope<any[]>>(
      `/vehicles/${route.params.id}/${path}`,
      {
        params: {
          page: rowsPage.value,
          per_page: rowsPerPage.value,
          ...(tab.value === "maintenance"
            ? {
                record_id: maintenanceFilters.recordId || undefined,
                from: maintenanceFilters.from || undefined,
                to: maintenanceFilters.to || undefined,
                performed_by: maintenanceFilters.performedBy || undefined,
                service_provider: maintenanceFilters.serviceProvider || undefined,
                maintenance_type: maintenanceFilters.maintenanceType || undefined,
                sort_by: maintenanceSortBy.value,
                sort_direction: maintenanceSortDirection.value,
              }
            : tab.value === "expenses"
              ? {
                  record_id: expenseFilters.recordId || undefined,
                  from: expenseFilters.from || undefined,
                  to: expenseFilters.to || undefined,
                  category: expenseFilters.category || undefined,
                  vendor: expenseFilters.vendor || undefined,
                  recorded_by: expenseFilters.recordedBy || undefined,
                  sort_by: expenseSortBy.value,
                  sort_direction: expenseSortDirection.value,
                }
              : tab.value === "fuel"
                ? {
                    record_id: fuelFilters.recordId || undefined,
                    from: fuelFilters.from || undefined,
                    to: fuelFilters.to || undefined,
                    recorded_by: fuelFilters.recordedBy || undefined,
                    sort_by: fuelSortBy.value,
                    sort_direction: fuelSortDirection.value,
                  }
            : {}),
        },
      },
    );
    rows.value = data.data;
    rowsMeta.value = data.meta;
  } finally {
    rowsLoading.value = false;
  }
}
function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function applyMaintenanceFilters() {
  if (maintenanceFilters.from && !maintenanceFilters.to)
    maintenanceFilters.to = maintenanceFilters.from;
  if (maintenanceFilters.to && !maintenanceFilters.from)
    maintenanceFilters.from = maintenanceFilters.to;
  maintenanceRange.value =
    maintenanceFilters.from === localDate(new Date()) &&
    maintenanceFilters.to === maintenanceFilters.from
      ? "today"
      : null;
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function setMaintenanceDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);
  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);
  maintenanceFilters.from = range === "all" ? "" : localDate(start);
  maintenanceFilters.to = range === "all" ? "" : localDate(end);
  maintenanceRange.value = range;
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function resetMaintenanceFilters() {
  clearMaintenanceFilters();
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function clearMaintenanceFilters() {
  Object.assign(maintenanceFilters, {
    recordId: "",
    from: "",
    to: "",
    performedBy: "",
    serviceProvider: "",
    maintenanceType: "",
  });
  maintenanceRange.value = "all";
}
function sortMaintenance(column: string) {
  if (maintenanceSortBy.value === column) {
    maintenanceSortDirection.value = maintenanceSortDirection.value === "asc" ? "desc" : "asc";
  } else {
    maintenanceSortBy.value = column;
    maintenanceSortDirection.value = "asc";
  }
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function applyExpenseFilters() {
  if (expenseFilters.from && !expenseFilters.to) expenseFilters.to = expenseFilters.from;
  if (expenseFilters.to && !expenseFilters.from) expenseFilters.from = expenseFilters.to;
  expenseRange.value =
    expenseFilters.from === localDate(new Date()) && expenseFilters.to === expenseFilters.from
      ? "today"
      : null;
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function setExpenseDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);
  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);
  expenseFilters.from = range === "all" ? "" : localDate(start);
  expenseFilters.to = range === "all" ? "" : localDate(end);
  expenseRange.value = range;
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function resetExpenseFilters() {
  clearExpenseFilters();
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function clearExpenseFilters() {
  Object.assign(expenseFilters, {
    recordId: "", from: "", to: "", category: "", vendor: "", recordedBy: "",
  });
  expenseRange.value = "all";
}
function sortExpense(column: string) {
  if (expenseSortBy.value === column) {
    expenseSortDirection.value = expenseSortDirection.value === "asc" ? "desc" : "asc";
  } else {
    expenseSortBy.value = column;
    expenseSortDirection.value = "asc";
  }
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
}
function applyFuelFilters() {
  if (fuelFilters.from && !fuelFilters.to) fuelFilters.to = fuelFilters.from;
  if (fuelFilters.to && !fuelFilters.from) fuelFilters.from = fuelFilters.to;
  fuelRange.value = fuelFilters.from === localDate(new Date()) && fuelFilters.to === fuelFilters.from ? "today" : null;
  if (rowsPage.value === 1) loadTab(); else rowsPage.value = 1;
}
function setFuelDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);
  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);
  fuelFilters.from = range === "all" ? "" : localDate(start);
  fuelFilters.to = range === "all" ? "" : localDate(end);
  fuelRange.value = range;
  if (rowsPage.value === 1) loadTab(); else rowsPage.value = 1;
}
function clearFuelFilters() {
  Object.assign(fuelFilters, { recordId: "", from: "", to: "", recordedBy: "" });
  fuelRange.value = "all";
}
function resetFuelFilters() {
  clearFuelFilters();
  if (rowsPage.value === 1) loadTab(); else rowsPage.value = 1;
}
function sortFuel(column: string) {
  if (fuelSortBy.value === column) fuelSortDirection.value = fuelSortDirection.value === "asc" ? "desc" : "asc";
  else { fuelSortBy.value = column; fuelSortDirection.value = "asc"; }
  if (rowsPage.value === 1) loadTab(); else rowsPage.value = 1;
}
function applyRecordFilters() {
  return tab.value === "expenses" ? applyExpenseFilters() : tab.value === "fuel" ? applyFuelFilters() : applyMaintenanceFilters();
}
function resetRecordFilters() {
  return tab.value === "expenses" ? resetExpenseFilters() : tab.value === "fuel" ? resetFuelFilters() : resetMaintenanceFilters();
}
function consumeFilterOpenRequest() {
  if (tab.value === "expenses") expenseFilterOpenRequest.value = 0;
  if (tab.value === "maintenance") maintenanceFilterOpenRequest.value = 0;
  if (tab.value === "fuel") fuelFilterOpenRequest.value = 0;
}
function setRecordDateRange(range: "today" | "week" | "month" | "all") {
  return tab.value === "expenses" ? setExpenseDateRange(range) : tab.value === "fuel" ? setFuelDateRange(range) : setMaintenanceDateRange(range);
}
function sortRecords(column: string) {
  return tab.value === "expenses" ? sortExpense(column) : tab.value === "fuel" ? sortFuel(column) : sortMaintenance(column);
}
watch(tab, (_currentTab, previousTab) => {
  if (previousTab === "maintenance") clearMaintenanceFilters();
  if (previousTab === "expenses") clearExpenseFilters();
  if (previousTab === "fuel") clearFuelFilters();
  rowsPage.value = 1;
  loadTab();
});
watch(rowsPage, loadTab);
watch(rowsPerPage, () => {
  rowsPage.value = 1;
  loadTab();
});
async function loadMaintenanceSchedules() {
  const { data } = await api.get<ApiEnvelope<any[]>>(
    `/vehicles/${route.params.id}/schedules`,
    { params: { per_page: 100 } },
  );
  maintenanceSchedules.value = data.data;
}
function selectMaintenanceSchedule() {
  const schedule = maintenanceSchedules.value.find(
    (item) => item.id === Number(form.maintenance_schedule_id),
  );
  form.maintenance_type = schedule
    ? schedule.maintenance_type
    : "Unscheduled maintenance";
}
async function initializeView() {
  await loadVehicle();
  if (route.query.tab === "maintenance") {
    tab.value = "maintenance";
    await loadMaintenanceSchedules();
    openForm();
    if (route.query.schedule) {
      form.maintenance_schedule_id = Number(route.query.schedule);
      selectMaintenanceSchedule();
    }
  } else if (route.query.tab === "expenses") {
    const expenseId = Number(route.query.expense);
    if (expenseId) {
      clearExpenseFilters();
      expenseFilters.recordId = String(expenseId);
      expenseRange.value = null;
      expenseFilterOpenRequest.value += 1;
    }
    tab.value = "expenses";
  }
}
onMounted(initializeView);
/** Populate and open the vehicle edit form. */
function openEdit() {
  if (!vehicle.value) return;
  editErrors.value = {};
  Object.assign(editForm, {
    plate_number: vehicle.value.plate_number,
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
    const { current_mileage: _currentMileage, ...payload } = editForm;
    await api.put(`/vehicles/${route.params.id}`, payload);
    editModal.value = false;
    await loadVehicle();
  } catch (e) {
    error.value = errorMessage(e);
    editErrors.value = validationErrors(e);
  } finally {
    editSaving.value = false;
  }
}
/** Return resource-specific defaults for a new record form. */
function formDefaults() {
  return {
    mileage: { mileage: vehicle.value?.current_mileage || 0, notes: "" },
    maintenance: {
      maintenance_schedule_id: "",
      service_date: new Date().toISOString().slice(0, 10),
      mileage: vehicle.value?.current_mileage || 0,
      maintenance_type: "Unscheduled maintenance",
      service_provider: "",
      labor_cost: 0,
      parts_cost: 0,
      other_cost: 0,
      notes: "",
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
      issue_date: "",
      expiration_date: "",
      document_number: "",
    },
    issues: {
      title: "",
      description: "",
      category: "Other",
      custom_category: "",
      priority: "medium",
      assigned_to_name: "",
    },
    fuel: {
      fuel_date: new Date().toISOString().slice(0, 10),
      mileage: vehicle.value?.current_mileage || 0,
      liters: 0,
      price_per_liter: 0,
    },
    schedules: {
      maintenance_type: "General Maintenance Schedule",
      interval_type: "both",
      interval_km: 5000,
      interval_months: 6,
      reminder_km: 2000,
      reminder_days: 30,
    },
  } as Record<string, Record<string, any>>;
}
const scheduleFieldHelp: Record<string, string> = {
  maintenance_type:
    "The service to perform, such as oil change, brake inspection, or general maintenance.",
  interval_type:
    "Choose mileage, date, or both. Both means maintenance is due when either limit is reached first.",
  interval_km:
    "The distance between services. For example, 5,000 means service every 5,000 km.",
  interval_months:
    "The number of months between services. For example, 6 means service every six months.",
  reminder_km:
    "How early to warn by mileage. If service is due at 10,000 km and this is 2,000, the warning starts at 8,000 km.",
  reminder_days:
    "How early to warn by date. For example, 30 means warn the owner 30 days before service is due.",
};
const maintenanceFieldHelp: Record<string, string> = {
  maintenance_schedule_id:
    "Select the planned schedule completed by this work. The system will calculate its next due date and mileage. Choose Unscheduled maintenance for unexpected repairs.",
  service_date: "The date when the maintenance work was completed.",
  mileage: "The vehicle odometer reading when the work was completed.",
  maintenance_type:
    "The work performed, such as Change Oil, Brake Repair, or Tire Replacement. Selecting a schedule fills this automatically.",
  service_provider:
    "The mechanic, workshop, dealership, or company that performed the work.",
  labor_cost: "The amount paid for mechanic or technician labor.",
  parts_cost: "The total cost of replacement parts and materials.",
  other_cost:
    "Additional charges such as towing, disposal fees, or shop supplies.",
  notes:
    "Extra information about the work, including an explanation of other costs.",
};
const vehicleTabFieldHelp: Record<string, Record<string, string>> = {
  mileage: {
    mileage: "The current odometer reading in kilometers.",
    notes: "Optional context about this reading or why it was recorded.",
  },
  expenses: {
    category:
      "The type of expense, such as Fuel, Maintenance, Toll, or Insurance.",
    amount: "The total amount paid for this expense.",
    expense_date: "The date when the expense was incurred.",
    vendor: "The person, shop, station, or company that received the payment.",
    description: "Additional details explaining what the expense covered.",
  },
  documents: {
    document_type:
      "The kind of vehicle document, such as Registration or Insurance.",
    issue_date:
      "The date when the document was issued or acquired by the vehicle owner.",
    expiration_date: "The date when this document expires or requires renewal.",
    document_number:
      "The official reference or identification number on the document.",
  },
  issues: {
    title: "A short name that clearly identifies the vehicle problem.",
    description: "A detailed explanation of the symptoms or problem observed.",
    category: "The vehicle system or area affected by the issue.",
    custom_category:
      "A custom category used when the predefined choices do not apply.",
    priority: "How urgently the issue needs attention, from low to critical.",
    assigned_to_name:
      "The person, team, mechanic, or workshop responsible for the issue.",
  },
  fuel: {
    fuel_date: "The date when the vehicle was refueled.",
    mileage: "The odometer reading at the time of refueling.",
    liters: "The quantity of fuel added, measured in liters.",
    price_per_liter: "The price paid for each liter of fuel.",
  },
};
const issueCategories = [
  "Engine",
  "Transmission",
  "Brakes",
  "Steering",
  "Suspension",
  "Electrical",
  "Battery",
  "Tires and Wheels",
  "Cooling System",
  "Air Conditioning",
  "Fuel System",
  "Body and Exterior",
  "Interior",
  "Safety Equipment",
  "Other",
];
function fieldHelp(key: string | number) {
  if (tab.value === "schedules") return scheduleFieldHelp[String(key)];
  if (tab.value === "maintenance") return maintenanceFieldHelp[String(key)];
  return vehicleTabFieldHelp[tab.value]?.[String(key)];
}
function fieldLabel(key: string | number) {
  if (String(key) === "maintenance_schedule_id") return "Maintenance schedule";
  if (String(key) === "issue_date") return "Acquired date";
  if (String(key) === "assigned_to_name") return "Assigned to";
  if (String(key) === "custom_category") return "Other category";
  return String(key).replaceAll("_", " ");
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
  if (tab.value === "maintenance" && !maintenanceSchedules.value.length) {
    loadMaintenanceSchedules();
  }
  modal.value = true;
}
/** Load a resource record into the shared editor. */
async function editRecord(row: any) {
  if (tab.value === "expenses" && row.maintenance_record_id) {
    tab.value = "maintenance";
    await loadTab();
    const source = rows.value.find(
      (record) => record.id === row.maintenance_record_id,
    );
    if (source) await editRecord(source);
    return;
  }
  if (tab.value === "expenses" && row.fuel_log_id) {
    tab.value = "fuel";
    await loadTab();
    const source = rows.value.find((record) => record.id === row.fuel_log_id);
    if (source) await editRecord(source);
    return;
  }
  editingRow.value = row;
  if (tab.value === "maintenance" && !maintenanceSchedules.value.length) {
    await loadMaintenanceSchedules();
  }
  resetRecordForm();
  Object.keys(form).forEach((key) => {
    if (row[key] !== null && row[key] !== undefined) {
      form[key] = String(key).includes("date")
        ? String(row[key]).slice(0, 10)
        : row[key];
    }
  });
  if (
    tab.value === "issues" &&
    row.category &&
    !issueCategories.includes(row.category)
  ) {
    form.category = "Other";
    form.custom_category = row.category;
  }
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
async function navigateToExpenseSource(row: any) {
  viewingExpense.value = null;
  if (row.maintenance_record_id) {
    Object.assign(maintenanceFilters, {
      recordId: String(row.maintenance_record_id),
      from: "",
      to: "",
      performedBy: "",
      serviceProvider: "",
      maintenanceType: "",
    });
    maintenanceRange.value = null;
    rowsPage.value = 1;
    maintenanceFilterOpenRequest.value += 1;
    tab.value = "maintenance";
    return;
  }

  if (row.fuel_log_id) {
    clearFuelFilters();
    fuelFilters.recordId = String(row.fuel_log_id);
    fuelRange.value = null;
    rowsPage.value = 1;
    fuelFilterOpenRequest.value += 1;
  }
  tab.value = "fuel";
}
/** Create or update the active vehicle resource record. */
async function save() {
  saving.value = true;
  try {
    let payload: Record<string, any> | FormData = { ...form };
    if (tab.value === "issues") {
      const issuePayload = payload as Record<string, any>;
      if (
        issuePayload.category === "Other" &&
        issuePayload.custom_category?.trim()
      ) {
        issuePayload.category = issuePayload.custom_category.trim();
      }
      delete issuePayload.custom_category;
    }
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
    const resource = row.maintenance_record_id
      ? "maintenance"
      : row.fuel_log_id
        ? "fuel"
        : tab.value;
    const id = row.maintenance_record_id || row.fuel_log_id || row.id;
    await api.delete(`/vehicles/${route.params.id}/${resource}/${id}`);
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
/** Load a private vehicle document into the authenticated preview modal. */
async function viewDocument(row: any) {
  const response = await api.get(`/documents/${row.id}/download`, {
    responseType: "blob",
  });
  closeDocumentPreview();
  documentPreviewUrl.value = URL.createObjectURL(response.data);
  documentPreviewName.value =
    row.file_path?.split("/").pop() || "vehicle-document";
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
  closeDocumentPreview();
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
  if (tab.value === "expenses") {
    return [
      "record_id",
      "category",
      "amount",
      "expense_date",
      "vendor",
      "recorded_by_name",
      "source",
    ];
  }
  if (tab.value === "fuel") {
    return [
      "record_id",
      "recorded_by_name",
      "fuel_date",
      "mileage",
      "liters",
      "price_per_liter",
      "total_amount",
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
  if (column === "record_id") return row.id;
  if (column === "performed_by_name") return row.performer?.name || "—";
  if (column === "service_provider")
    return row.service_provider || "Not specified";
  if (column === "recorded_by_name") return row.recorder?.name || "—";
  if (column === "reported_by_name") return row.reporter?.name || "—";
  if (column === "assigned_to_name")
    return row.assigned_to_name || row.assignee?.name || "Unassigned";
  return row[column];
}
/** Format nullable scalar table values for display. */
function pretty(v: any) {
  if (v === null || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v))
    return formatDateTime(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))
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
          <button
            v-if="auth.can('mileage.view')"
            type="button"
            @click="tab = 'mileage'"
          >
            <span><Gauge /></span><small>CURRENT MILEAGE</small
            ><strong
              >{{ Number(vehicle.current_mileage).toLocaleString() }} km</strong
            >
          </button>
          <button
            v-if="auth.can('schedules.view')"
            type="button"
            @click="tab = 'schedules'"
          >
            <span><Wrench /></span><small>NEXT MAINTENANCE SCHEDULE</small
            ><strong>{{
              nextMaintenanceSchedule?.next_service_mileage
                ? Number(
                    nextMaintenanceSchedule.next_service_mileage,
                  ).toLocaleString() + " km"
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
          <button
            v-if="auth.can('documents.view')"
            type="button"
            @click="tab = 'documents'"
          >
            <span><FileText /></span><small>DOCUMENTS</small
            ><strong>{{ vehicle.documents?.length || 0 }} on file</strong>
          </button>
          <button
            v-if="auth.can('expenses.view')"
            type="button"
            @click="tab = 'expenses'"
          >
            <span><ReceiptText /></span><small>EXPENSES</small
            ><strong>{{ money.format(Number(vehicle.expenses_sum_amount || 0)) }}</strong>
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
              v-if="nextMaintenanceSchedule && auth.can('schedules.view')"
              type="button"
              class="attention attention-link"
              @click="tab = 'schedules'"
            >
              <span class="metric-icon amber"><Wrench /></span>
              <div>
                <strong>{{ nextMaintenanceSchedule.maintenance_type }}</strong>
                <p>
                  {{
                    nextMaintenanceSchedule.next_service_date
                      ? formatDate(nextMaintenanceSchedule.next_service_date)
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
        :page-amount-total="pageAmountTotal"
        :overall-amount-total="overallAmountTotal"
        v-model:page="rowsPage"
        v-model:per-page="rowsPerPage"
        :can-create="auth.can(`${tab}.create`)"
        :can-update="auth.can(`${tab}.update`)"
        :can-delete="auth.can(`${tab}.delete`)"
        :deleting-id="deletingId"
        :filters="tab === 'expenses' ? expenseFilters : tab === 'fuel' ? fuelFilters : maintenanceFilters"
        :active-range="tab === 'expenses' ? expenseRange : tab === 'fuel' ? fuelRange : maintenanceRange"
        :sort-by="tab === 'expenses' ? expenseSortBy : tab === 'fuel' ? fuelSortBy : maintenanceSortBy"
        :sort-direction="tab === 'expenses' ? expenseSortDirection : tab === 'fuel' ? fuelSortDirection : maintenanceSortDirection"
        :filter-open-request="tab === 'expenses' ? expenseFilterOpenRequest : tab === 'fuel' ? fuelFilterOpenRequest : maintenanceFilterOpenRequest"
        :columns="columns"
        :cell-value="cellValue"
        :display-value="pretty"
        @add="openForm"
        @edit="editRecord"
        @remove="requestDelete"
        @view-maintenance="viewingMaintenance = $event"
        @view-expense="viewingExpense = $event"
        @navigate-source="navigateToExpenseSource"
        @view-document="viewDocument"
        @view-photo="downloadMileagePhoto"
        @apply-filters="applyRecordFilters"
        @reset-filters="resetRecordFilters"
        @set-date-range="setRecordDateRange"
        @filter-opened="consumeFilterOpenRequest"
        @sort="sortRecords" />
      <VehicleEditModal
        :open="editModal"
        :form="editForm"
        :errors="editErrors"
        :saving="editSaving"
        @close="editModal = false"
        @save="saveEdit" />
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
            <label
              v-for="(_, key) in form"
              :key="key"
              v-show="
                key !== 'custom_category' ||
                (tab === 'issues' && form.category === 'Other')
              "
              :class="{ full: ['notes', 'description'].includes(String(key)) }"
              ><span class="dynamic-field-label">
                {{ fieldLabel(key) }}
                <button
                  v-if="fieldHelp(key)"
                  type="button"
                  class="field-help-button"
                  :aria-label="`Explain ${fieldLabel(key)}`"
                  :aria-describedby="`field-help-${String(key)}`"
                >
                  <CircleHelp />
                  <span
                    :id="`field-help-${String(key)}`"
                    class="field-help-tooltip"
                    role="tooltip"
                  >
                    {{ fieldHelp(key) }}
                  </span>
                </button>
              </span>
              <select
                v-if="
                  tab === 'maintenance' && key === 'maintenance_schedule_id'
                "
                v-model="form[key]"
                @change="selectMaintenanceSchedule"
              >
                <option value="">Unscheduled maintenance</option>
                <option
                  v-for="schedule in maintenanceSchedules"
                  :key="schedule.id"
                  :value="schedule.id"
                >
                  {{ schedule.maintenance_type }}
                  <template v-if="schedule.next_service_mileage">
                    —
                    {{ Number(schedule.next_service_mileage).toLocaleString() }}
                    km
                  </template>
                  <template v-else-if="schedule.next_service_date">
                    — {{ formatDate(schedule.next_service_date) }}
                  </template>
                </option></select
              ><textarea
                v-else-if="['notes', 'description'].includes(String(key))"
                v-model="form[key]"
              ></textarea
              ><select
                v-else-if="tab === 'schedules' && key === 'interval_type'"
                v-model="form[key]"
              >
                <option value="mileage">Mileage</option>
                <option value="date">Date</option>
                <option value="both">Both</option></select
              ><select
                v-else-if="tab === 'issues' && key === 'category'"
                v-model="form[key]"
              >
                <option
                  v-for="category in issueCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option></select
              ><select v-else-if="key === 'priority'" v-model="form[key]">
                <option>low</option>
                <option>medium</option>
                <option>high</option>
                <option>critical</option></select
              ><input
                v-else
                v-model="form[key]"
                :required="
                  tab === 'issues' &&
                  key === 'custom_category' &&
                  form.category === 'Other'
                "
                :placeholder="
                  key === 'custom_category'
                    ? 'Enter a custom issue category'
                    : ''
                "
                :type="
                  String(key).includes('date')
                    ? 'date'
                    : typeof form[key] === 'number'
                      ? 'number'
                      : 'text'
                "
              /><small
                v-if="
                  tab === 'maintenance' &&
                  key === 'maintenance_schedule_id' &&
                  !maintenanceSchedules.length
                "
                class="field-empty-help"
              >
                No schedules available. Create one in the Maintenance Schedule
                tab, or save this as unscheduled maintenance.
              </small></label
            >
            <label v-if="tab === 'documents'" class="file-picker">
              <span class="dynamic-field-label">
                Attachment
                <button
                  type="button"
                  class="field-help-button"
                  aria-label="Explain attachment"
                  aria-describedby="document-attachment-help"
                >
                  <CircleHelp />
                  <span
                    id="document-attachment-help"
                    class="field-help-tooltip"
                    role="tooltip"
                    >Upload a PDF, JPG, or PNG copy of the vehicle document for
                    secure storage.</span
                  >
                </button>
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                @change="selectDocumentFile"
              />
              <small>PDF, JPG or PNG up to 10 MB</small>
            </label>
            <label v-if="tab === 'mileage'" class="file-picker">
              <span class="dynamic-field-label">
                Odometer photo
                <button
                  type="button"
                  class="field-help-button"
                  aria-label="Explain odometer photo"
                  aria-describedby="odometer-photo-help"
                >
                  <CircleHelp />
                  <span
                    id="odometer-photo-help"
                    class="field-help-tooltip"
                    role="tooltip"
                    >Upload a clear photo of the odometer as evidence of the
                    recorded mileage.</span
                  >
                </button>
              </span>
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
                <button
                  type="button"
                  class="field-help-button"
                  aria-label="Explain mileage override"
                  aria-describedby="mileage-override-help"
                >
                  <CircleHelp />
                  <span
                    id="mileage-override-help"
                    class="field-help-tooltip"
                    role="tooltip"
                    >Allows a lower mileage only for a verified correction or
                    odometer replacement. The action is recorded in the audit
                    log.</span
                  >
                </button>
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
              <button
                type="button"
                class="btn"
                @click="downloadPreviewDocument"
              >
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
              title="Vehicle document preview"
            ></iframe>
            <img
              v-else-if="documentPreviewIsImage"
              :src="documentPreviewUrl"
              alt="Vehicle document preview"
            />
            <EmptyState
              v-else
              title="Preview unavailable"
              message="This file type cannot be previewed. Use Download to open it on your device."
            />
          </div>
        </div>
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
        v-if="viewingExpense"
        class="modal-backdrop"
        @click.self="viewingExpense = null"
      >
        <section class="modal small-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <div>
              <h2>Expense details</h2>
              <p>{{ viewingExpense.source }}</p>
            </div>
            <button
              type="button"
              class="icon-btn"
              aria-label="Close"
              @click="viewingExpense = null"
            >
              <X />
            </button>
          </div>
          <dl class="maintenance-detail-list">
            <div>
              <dt>Category</dt>
              <dd>{{ viewingExpense.category }}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{{ money.format(Number(viewingExpense.amount)) }}</dd>
            </div>
            <div>
              <dt>Expense date</dt>
              <dd>{{ formatDate(viewingExpense.expense_date) }}</dd>
            </div>
            <div>
              <dt>Vendor</dt>
              <dd>{{ viewingExpense.vendor || "—" }}</dd>
            </div>
            <div class="full">
              <dt>Recorded by</dt>
              <dd>{{ viewingExpense.recorder?.name || "—" }}</dd>
            </div>
            <div class="full">
              <dt>Source</dt>
              <dd>
                <button
                  v-if="
                    viewingExpense.maintenance_record_id ||
                    viewingExpense.fuel_log_id
                  "
                  type="button"
                  class="source-link"
                  @click="navigateToExpenseSource(viewingExpense)"
                >
                  {{ viewingExpense.source }}</button
                ><template v-else>{{ viewingExpense.source }}</template>
              </dd>
            </div>
            <div class="full">
              <dt>Description</dt>
              <dd>{{ viewingExpense.description || "—" }}</dd>
            </div>
          </dl>
          <div class="modal-actions">
            <button type="button" class="btn" @click="viewingExpense = null">
              Close
            </button>
          </div>
        </section>
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
              <dt>Maintenance schedule</dt>
              <dd>
                {{
                  viewingMaintenance.maintenance_schedule?.maintenance_type ||
                  "Unscheduled maintenance"
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
        :title="
          pendingDelete?.maintenance_record_id
            ? 'Delete maintenance and expense?'
            : pendingDelete?.fuel_log_id
              ? 'Delete fuel log and expense?'
              : `Delete ${tabs.find((item) => item[0] === tab)?.[1] || 'record'} record?`
        "
        :message="
          pendingDelete?.maintenance_record_id
            ? 'This generated expense is linked to a maintenance record. Continuing will delete both the maintenance record and its expense. This action cannot be undone.'
            : pendingDelete?.fuel_log_id
              ? 'This generated expense is linked to a fuel log. Continuing will delete both the fuel log and its expense. This action cannot be undone.'
              : 'This record will be permanently removed. This action cannot be undone.'
        "
        @cancel="pendingDelete = null"
        @confirm="deleteRecord"
    /></template>
  </div>
</template>
