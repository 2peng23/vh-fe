import type { Ref } from "vue";
import { localDate } from "../../utils";

export type RecordRange = "today" | "week" | "month" | "all" | null;
export type SortDirection = "asc" | "desc";

export { localDate };

export function dateBounds(range: Exclude<RecordRange, null>) {
  const end = new Date();
  const start = new Date(end);
  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);
  return {
    from: range === "all" ? "" : localDate(start),
    to: range === "all" ? "" : localDate(end),
  };
}

export function normalizeDatePair(filters: { from: string; to: string }) {
  if (filters.from && !filters.to) filters.to = filters.from;
  if (filters.to && !filters.from) filters.from = filters.to;
}

export function reloadFromFirstPage(
  rowsPage: Ref<number>,
  reload: () => void | Promise<void>,
) {
  if (rowsPage.value === 1) return reload();
  rowsPage.value = 1;
}
