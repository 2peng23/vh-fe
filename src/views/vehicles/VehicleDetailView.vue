<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { ArrowLeft, CarFront, Pencil } from "lucide-vue-next";
import api, { errorMessage } from "../../api/client";
import { useAuthStore } from "../../stores/auth";
import type { ApiEnvelope, Vehicle } from "../../types";
import LoadingState from "../../components/LoadingState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal.vue";
import VehicleRecordsSection from "../../components/vehicles/VehicleRecordsSection.vue";
import VehicleEditModal from "../../components/vehicles/VehicleEditModal.vue";
import VehicleOverview from "../../components/vehicles/detail/VehicleOverview.vue";
import VehicleRecordFormModal from "../../components/vehicles/detail/VehicleRecordFormModal.vue";
import DocumentPreviewModal from "../../components/vehicles/detail/DocumentPreviewModal.vue";
import PhotoPreviewModal from "../../components/vehicles/detail/PhotoPreviewModal.vue";
import ExpenseDetailsModal from "../../components/vehicles/detail/ExpenseDetailsModal.vue";
import MaintenanceDetailsModal from "../../components/vehicles/detail/MaintenanceDetailsModal.vue";
import { useVehicleRecordFilters } from "../../composables/vehicles/useVehicleRecordFilters";
import { useVehicleRecordList } from "../../composables/vehicles/useVehicleRecordList";
import { useVehicleRecordEditor } from "../../composables/vehicles/useVehicleRecordEditor";
import { useVehicleEditor } from "../../composables/vehicles/useVehicleEditor";
import { useVehiclePreviews } from "../../composables/vehicles/useVehiclePreviews";
import {
  prettyRecordValue,
  vehicleRecordCellValue,
  vehicleRecordColumns,
} from "../../utils/vehicles/vehicleRecordTable";
import { vehicleDetailTabs as tabs } from "./vehicleDetail.config";

const route = useRoute();
const auth = useAuthStore();
const vehicleId = String(route.params.id);

const vehicle = ref<Vehicle>();
const loading = ref(true);
const error = ref("");
const tab = ref("overview");
const rowsPage = ref(1);

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

async function loadVehicle() {
  try {
    const { data } = await api.get<ApiEnvelope<Vehicle>>(`/vehicles/${vehicleId}`);
    vehicle.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

let recordList!: ReturnType<typeof useVehicleRecordList>;
const filters = useVehicleRecordFilters(tab, rowsPage, () => recordList.loadTab());
recordList = useVehicleRecordList(vehicleId, tab, error, filters.paramsFor, rowsPage);

const {
  rows,
  rowsMeta,
  rowsPerPage,
  rowsLoading,
  pageAmountTotal,
  overallAmountTotal,
  loadTab,
} = recordList;

const previews = useVehiclePreviews(error);
const {
  mileageOverride,
  documentPreviewUrl,
  documentPreviewOpen,
  documentPreviewName,
  documentPreviewIsPdf,
  documentPreviewIsImage,
  photoPreviewUrl,
  photoPreviewOpen,
  currentPhotoUrl,
  currentPhotoLoading,
  selectDocumentFile,
  selectMileagePhoto,
  viewDocument,
  downloadPreviewDocument,
  closeDocumentPreview,
  downloadMileagePhoto,
  downloadPreviewPhoto,
  closePhotoPreview,
} = previews;

const vehicleEditor = useVehicleEditor(vehicleId, vehicle, error, loadVehicle);
const { editModal, editSaving, editErrors, editForm, openEdit, saveEdit } = vehicleEditor;

function resourceLabel(resource: string) {
  return tabs.find((item) => item[0] === resource)?.[1] || resource;
}

const recordEditor = useVehicleRecordEditor({
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
});

const {
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
} = recordEditor;

const visibleTabs = computed(() =>
  tabs.filter(([key]) => key === "overview" || auth.can(`${key}.view`)),
);

const nextMaintenanceSchedule = computed(() => vehicle.value?.schedules?.[0] as any);
const remaining = computed(() =>
  nextMaintenanceSchedule.value?.next_service_mileage
    ? nextMaintenanceSchedule.value.next_service_mileage - (vehicle.value?.current_mileage || 0)
    : null,
);

const activeFilters = computed(() =>
  tab.value === "expenses"
    ? filters.expenseFilters
    : tab.value === "fuel"
      ? filters.fuelFilters
      : filters.maintenanceFilters,
);

const activeRange = computed(() =>
  tab.value === "expenses"
    ? filters.expenseRange.value
    : tab.value === "fuel"
      ? filters.fuelRange.value
      : filters.maintenanceRange.value,
);

const activeSortBy = computed(() =>
  tab.value === "expenses"
    ? filters.expenseSortBy.value
    : tab.value === "fuel"
      ? filters.fuelSortBy.value
      : filters.maintenanceSortBy.value,
);

const activeSortDirection = computed(() =>
  tab.value === "expenses"
    ? filters.expenseSortDirection.value
    : tab.value === "fuel"
      ? filters.fuelSortDirection.value
      : filters.maintenanceSortDirection.value,
);

const activeFilterOpenRequest = computed(() =>
  tab.value === "expenses"
    ? filters.expenseFilterOpenRequest.value
    : tab.value === "fuel"
      ? filters.fuelFilterOpenRequest.value
      : filters.maintenanceFilterOpenRequest.value,
);

function columns(row: any) {
  return vehicleRecordColumns(tab.value, row);
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
    return;
  }

  if (route.query.tab === "expenses") {
    const expenseId = Number(route.query.expense);
    if (expenseId) filters.requestExpenseRecord(expenseId);
    tab.value = "expenses";
  }
}

watch(tab, (_currentTab, previousTab) => {
  filters.clearFiltersFor(previousTab);
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
});

watch(rowsPage, loadTab);
watch(rowsPerPage, () => {
  if (rowsPage.value === 1) loadTab();
  else rowsPage.value = 1;
});

onMounted(initializeView);
</script>

<template>
  <div>
    <RouterLink to="/vehicles" class="back-link">
      <ArrowLeft />Back to vehicles
    </RouterLink>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />

    <template v-else-if="vehicle">
      <header class="vehicle-hero">
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
          <button v-if="auth.can('vehicles.update')" class="btn" @click="openEdit">
            <Pencil :size="16" />Edit vehicle
          </button>
        </div>
      </header>

      <nav class="tabs">
        <button
          v-for="item in visibleTabs"
          :key="item[0]"
          :class="{ active: tab === item[0] }"
          @click="tab = item[0]"
        >
          {{ item[1] }}
        </button>
      </nav>

      <VehicleOverview
        v-if="tab === 'overview'"
        :vehicle="vehicle"
        :next-maintenance-schedule="nextMaintenanceSchedule"
        :remaining="remaining"
        :can-view-mileage="auth.can('mileage.view')"
        :can-view-schedules="auth.can('schedules.view')"
        :can-view-documents="auth.can('documents.view')"
        :can-view-expenses="auth.can('expenses.view')"
        :money="money"
        @select-tab="tab = $event"
      />

      <VehicleRecordsSection
        v-else
        :title="resourceLabel(tab)"
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
        :filters="activeFilters"
        :active-range="activeRange"
        :sort-by="activeSortBy"
        :sort-direction="activeSortDirection"
        :filter-open-request="activeFilterOpenRequest"
        :columns="columns"
        :cell-value="vehicleRecordCellValue"
        :display-value="prettyRecordValue"
        @add="openForm"
        @edit="editRecord"
        @remove="requestDelete"
        @view-maintenance="viewingMaintenance = $event"
        @view-expense="viewingExpense = $event"
        @navigate-source="navigateToExpenseSource"
        @view-document="viewDocument"
        @view-photo="downloadMileagePhoto"
        @apply-filters="filters.applyRecordFilters"
        @reset-filters="filters.resetRecordFilters"
        @set-date-range="filters.setRecordDateRange"
        @filter-opened="filters.consumeFilterOpenRequest"
        @sort="filters.sortRecords"
      />

      <VehicleEditModal
        :open="editModal"
        :form="editForm"
        :errors="editErrors"
        :saving="editSaving"
        @close="editModal = false"
        @save="saveEdit"
      />

      <VehicleRecordFormModal
        :open="modal"
        :resource="tab"
        :form="form"
        :editing-row="editingRow"
        :saving="saving"
        :vehicle-name="`${vehicle.brand} ${vehicle.model}`"
        :maintenance-schedules="maintenanceSchedules"
        :current-photo-loading="currentPhotoLoading"
        :current-photo-url="currentPhotoUrl"
        v-model:mileage-override="mileageOverride"
        :can-override-mileage="auth.can('mileage.override')"
        @close="modal = false"
        @save="save"
        @select-maintenance-schedule="selectMaintenanceSchedule"
        @select-document-file="selectDocumentFile"
        @select-mileage-photo="selectMileagePhoto"
      />

      <DocumentPreviewModal
        :open="documentPreviewOpen"
        :url="documentPreviewUrl"
        :name="documentPreviewName"
        :is-pdf="documentPreviewIsPdf"
        :is-image="documentPreviewIsImage"
        @close="closeDocumentPreview"
        @download="downloadPreviewDocument"
      />

      <PhotoPreviewModal
        :open="photoPreviewOpen"
        :url="photoPreviewUrl"
        @close="closePhotoPreview"
        @download="downloadPreviewPhoto"
      />

      <ExpenseDetailsModal
        :expense="viewingExpense"
        :money="money"
        @close="viewingExpense = null"
        @navigate-source="navigateToExpenseSource"
      />

      <MaintenanceDetailsModal
        :maintenance="viewingMaintenance"
        :money="money"
        @close="viewingMaintenance = null"
      />

      <ConfirmDeleteModal
        :open="!!pendingDelete"
        :loading="deletingId !== null"
        :title="deleteTitle"
        :message="deleteMessage"
        @cancel="pendingDelete = null"
        @confirm="deleteRecord"
      />
    </template>
  </div>
</template>
