import type { Ref } from "vue";
import type { RecordRange } from "./recordFilterUtils";
import { useMaintenanceRecordFilters } from "./useMaintenanceRecordFilters";
import { useExpenseRecordFilters } from "./useExpenseRecordFilters";
import { useFuelRecordFilters } from "./useFuelRecordFilters";

export function useVehicleRecordFilters(
  tab: Ref<string>,
  rowsPage: Ref<number>,
  reload: () => void | Promise<void>,
) {
  const maintenance = useMaintenanceRecordFilters(rowsPage, reload);
  const expense = useExpenseRecordFilters(rowsPage, reload);
  const fuel = useFuelRecordFilters(rowsPage, reload);

  function current() {
    if (tab.value === "expenses") return expense;
    if (tab.value === "fuel") return fuel;
    return maintenance;
  }

  function applyRecordFilters() {
    return current().apply();
  }

  function resetRecordFilters() {
    return current().reset();
  }

  function setRecordDateRange(range: Exclude<RecordRange, null>) {
    return current().setDateRange(range);
  }

  function sortRecords(column: string) {
    return current().sort(column);
  }

  function consumeFilterOpenRequest() {
    current().openRequest.value = 0;
  }

  function clearFiltersFor(resource: string) {
    if (resource === "maintenance") maintenance.clear();
    if (resource === "expenses") expense.clear();
    if (resource === "fuel") fuel.clear();
  }

  function paramsFor(resource: string) {
    if (resource === "maintenance") return maintenance.params();
    if (resource === "expenses") return expense.params();
    if (resource === "fuel") return fuel.params();
    return {};
  }

  return {
    maintenanceFilterOpenRequest: maintenance.openRequest,
    maintenanceRange: maintenance.range,
    maintenanceSortBy: maintenance.sortBy,
    maintenanceSortDirection: maintenance.sortDirection,
    maintenanceFilters: maintenance.filters,

    expenseFilterOpenRequest: expense.openRequest,
    expenseRange: expense.range,
    expenseSortBy: expense.sortBy,
    expenseSortDirection: expense.sortDirection,
    expenseFilters: expense.filters,

    fuelFilterOpenRequest: fuel.openRequest,
    fuelRange: fuel.range,
    fuelSortBy: fuel.sortBy,
    fuelSortDirection: fuel.sortDirection,
    fuelFilters: fuel.filters,

    applyRecordFilters,
    resetRecordFilters,
    setRecordDateRange,
    sortRecords,
    consumeFilterOpenRequest,
    clearFiltersFor,
    requestMaintenanceRecord: maintenance.requestRecord,
    requestExpenseRecord: expense.requestRecord,
    requestFuelRecord: fuel.requestRecord,
    paramsFor,
  };
}
