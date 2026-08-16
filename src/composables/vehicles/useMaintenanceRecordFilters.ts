import { reactive, ref, type Ref } from "vue";
import {
  dateBounds,
  localDate,
  normalizeDatePair,
  reloadFromFirstPage,
  type RecordRange,
  type SortDirection,
} from "./recordFilterUtils";

export function useMaintenanceRecordFilters(
  rowsPage: Ref<number>,
  reload: () => void | Promise<void>,
) {
  const openRequest = ref(0);
  const range = ref<RecordRange>("all");
  const sortBy = ref("service_date");
  const sortDirection = ref<SortDirection>("desc");
  const filters = reactive({
    recordId: "",
    from: "",
    to: "",
    performedBy: "",
    serviceProvider: "",
    maintenanceType: "",
  });

  function clear() {
    Object.assign(filters, {
      recordId: "",
      from: "",
      to: "",
      performedBy: "",
      serviceProvider: "",
      maintenanceType: "",
    });
    range.value = "all";
  }

  function apply() {
    normalizeDatePair(filters);
    range.value =
      filters.from === localDate(new Date()) && filters.to === filters.from ? "today" : null;
    return reloadFromFirstPage(rowsPage, reload);
  }

  function reset() {
    clear();
    return reloadFromFirstPage(rowsPage, reload);
  }

  function setDateRange(value: Exclude<RecordRange, null>) {
    Object.assign(filters, dateBounds(value));
    range.value = value;
    return reloadFromFirstPage(rowsPage, reload);
  }

  function sort(column: string) {
    if (sortBy.value === column) {
      sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    } else {
      sortBy.value = column;
      sortDirection.value = "asc";
    }
    return reloadFromFirstPage(rowsPage, reload);
  }

  function requestRecord(id: number) {
    clear();
    filters.recordId = String(id);
    range.value = null;
    openRequest.value += 1;
  }

  function params() {
    return {
      record_id: filters.recordId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      performed_by: filters.performedBy || undefined,
      service_provider: filters.serviceProvider || undefined,
      maintenance_type: filters.maintenanceType || undefined,
      sort_by: sortBy.value,
      sort_direction: sortDirection.value,
    };
  }

  return { openRequest, range, sortBy, sortDirection, filters, clear, apply, reset, setDateRange, sort, requestRecord, params };
}
