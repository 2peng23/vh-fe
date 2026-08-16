import { computed, reactive, ref, type Ref } from "vue";
import api, { errorMessage } from "../../api/client";
import type { ApiEnvelope, Vehicle } from "../../types";
import { createRecordDefaults, issueCategories } from "../../views/vehicles/vehicleRecordForm.config";
import type { useVehicleRecordFilters } from "./useVehicleRecordFilters";
import type { useVehiclePreviews } from "./useVehiclePreviews";

type Filters = ReturnType<typeof useVehicleRecordFilters>;
type Previews = ReturnType<typeof useVehiclePreviews>;

export function useVehicleRecordEditor(options: {
  vehicleId: string | number;
  tab: Ref<string>;
  vehicle: Ref<Vehicle | undefined>;
  auth: { can: (permission: string) => boolean };
  error: Ref<string>;
  rows: Ref<any[]>;
  rowsPage: Ref<number>;
  loadVehicle: () => Promise<void>;
  loadTab: () => Promise<void>;
  filters: Filters;
  previews: Previews;
  resourceLabel: (resource: string) => string;
}) {
  const {
    vehicleId,
    tab,
    vehicle,
    auth,
    error,
    rows,
    rowsPage,
    loadVehicle,
    loadTab,
    filters,
    previews,
    resourceLabel,
  } = options;

  const modal = ref(false);
  const saving = ref(false);
  const form = reactive<Record<string, any>>({});
  const editingRow = ref<any | null>(null);
  const maintenanceSchedules = ref<any[]>([]);

  const deletingId = ref<number | null>(null);
  const pendingDelete = ref<any | null>(null);
  const viewingMaintenance = ref<any | null>(null);
  const viewingExpense = ref<any | null>(null);

  async function loadMaintenanceSchedules() {
    const { data } = await api.get<ApiEnvelope<any[]>>(
      `/vehicles/${vehicleId}/schedules`,
      { params: { per_page: 100 } },
    );
    maintenanceSchedules.value = data.data;
  }

  function selectMaintenanceSchedule() {
    const schedule = maintenanceSchedules.value.find(
      (item) => item.id === Number(form.maintenance_schedule_id),
    );
    form.maintenance_type = schedule?.maintenance_type || "Unscheduled maintenance";
  }

  function resetRecordForm() {
    previews.resetEditorFiles();
    Object.keys(form).forEach((key) => delete form[key]);
    Object.assign(form, createRecordDefaults(vehicle.value)[tab.value]);
  }

  function openForm() {
    editingRow.value = null;
    resetRecordForm();
    if (tab.value === "maintenance" && !maintenanceSchedules.value.length) {
      loadMaintenanceSchedules();
    }
    modal.value = true;
  }

  async function editRecord(row: any) {
    if (tab.value === "expenses" && row.maintenance_record_id) {
      tab.value = "maintenance";
      await loadTab();
      const source = rows.value.find((record) => record.id === row.maintenance_record_id);
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
        form[key] = key.includes("date") ? String(row[key]).slice(0, 10) : row[key];
      }
    });

    if (tab.value === "issues" && row.category && !issueCategories.includes(row.category)) {
      form.category = "Other";
      form.custom_category = row.category;
    }

    modal.value = true;

    if (tab.value === "mileage") {
      previews.mileageOverride.value = Boolean(row.is_override);
      await previews.loadCurrentMileagePhoto(row);
    }
  }

  async function save() {
    saving.value = true;
    error.value = "";

    try {
      let payload: Record<string, any> | FormData = { ...form };

      if (tab.value === "issues") {
        const issuePayload = payload as Record<string, any>;
        if (issuePayload.category === "Other" && issuePayload.custom_category?.trim()) {
          issuePayload.category = issuePayload.custom_category.trim();
        }
        delete issuePayload.custom_category;
      }

      if (tab.value === "documents" || tab.value === "mileage") {
        const multipart = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value !== null && value !== "") multipart.append(key, String(value));
        });

        if (previews.documentFile.value) multipart.append("file", previews.documentFile.value);
        if (previews.mileagePhoto.value) multipart.append("photo", previews.mileagePhoto.value);

        if (tab.value === "mileage" && auth.can("mileage.override")) {
          multipart.append("override", previews.mileageOverride.value ? "1" : "0");
        }

        if (editingRow.value) multipart.append("_method", "PUT");
        payload = multipart;
      }

      const endpoint = `/vehicles/${vehicleId}/${tab.value}${editingRow.value ? `/${editingRow.value.id}` : ""}`;

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
      const resource = row.maintenance_record_id
        ? "maintenance"
        : row.fuel_log_id
          ? "fuel"
          : tab.value;
      const id = row.maintenance_record_id || row.fuel_log_id || row.id;

      await api.delete(`/vehicles/${vehicleId}/${resource}/${id}`);
      pendingDelete.value = null;
      await Promise.all([loadVehicle(), loadTab()]);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      deletingId.value = null;
    }
  }

  function navigateToExpenseSource(row: any) {
    viewingExpense.value = null;

    if (row.maintenance_record_id) {
      filters.requestMaintenanceRecord(row.maintenance_record_id);
      rowsPage.value = 1;
      tab.value = "maintenance";
      return;
    }

    if (row.fuel_log_id) {
      filters.requestFuelRecord(row.fuel_log_id);
      rowsPage.value = 1;
      tab.value = "fuel";
    }
  }

  const deleteTitle = computed(() => {
    if (pendingDelete.value?.maintenance_record_id) return "Delete maintenance and expense?";
    if (pendingDelete.value?.fuel_log_id) return "Delete fuel log and expense?";
    return `Delete ${resourceLabel(tab.value)} record?`;
  });

  const deleteMessage = computed(() => {
    if (pendingDelete.value?.maintenance_record_id) {
      return "This generated expense is linked to a maintenance record. Continuing will delete both the maintenance record and its expense. This action cannot be undone.";
    }
    if (pendingDelete.value?.fuel_log_id) {
      return "This generated expense is linked to a fuel log. Continuing will delete both the fuel log and its expense. This action cannot be undone.";
    }
    return "This record will be permanently removed. This action cannot be undone.";
  });

  return {
    modal,
    saving,
    form,
    editingRow,
    maintenanceSchedules,
    deletingId,
    pendingDelete,
    viewingMaintenance,
    viewingExpense,
    loadMaintenanceSchedules,
    selectMaintenanceSchedule,
    openForm,
    editRecord,
    save,
    requestDelete,
    deleteRecord,
    navigateToExpenseSource,
    deleteTitle,
    deleteMessage,
  };
}
