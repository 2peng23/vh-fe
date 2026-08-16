import { computed, ref, type Ref } from "vue";
import api, { errorMessage } from "../../api/client";
import type { ApiEnvelope, PaginationMeta } from "../../types";

export function useVehicleRecordList(
  vehicleId: string | number,
  tab: Ref<string>,
  error: Ref<string>,
  paramsFor: (resource: string) => Record<string, any>,
  rowsPage: Ref<number>,
) {
  const rows = ref<any[]>([]);
  const rowsMeta = ref<PaginationMeta>();
  const rowsPerPage = ref(20);
  const rowsLoading = ref(false);

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

  async function loadTab() {
    if (tab.value === "overview") return;

    rowsLoading.value = true;
    try {
      const { data } = await api.get<ApiEnvelope<any[]>>(
        `/vehicles/${vehicleId}/${tab.value}`,
        {
          params: {
            page: rowsPage.value,
            per_page: rowsPerPage.value,
            ...paramsFor(tab.value),
          },
        },
      );
      rows.value = data.data;
      rowsMeta.value = data.meta;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      rowsLoading.value = false;
    }
  }

  return {
    rows,
    rowsMeta,
    rowsPage,
    rowsPerPage,
    rowsLoading,
    pageAmountTotal,
    overallAmountTotal,
    loadTab,
  };
}
