<script setup lang="ts">
import { ref, watch } from "vue";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Eye, Filter, Pencil, Plus, ReceiptText, RotateCcw, Trash2, TrendingUp } from "lucide-vue-next";
import EmptyState from "../EmptyState.vue";
import LoadingState from "../LoadingState.vue";
import PaginationControls from "../PaginationControls.vue";
import type { PaginationMeta } from "../../types";

type VehicleRecord = Record<string, any> & { id: number };

const props = defineProps<{
  title: string;
  resource: string;
  rows: VehicleRecord[];
  loading: boolean;
  meta?: PaginationMeta;
  pageAmountTotal?: number;
  overallAmountTotal?: number;
  page: number;
  perPage: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  deletingId: number | null;
  filters?: Record<string, string>;
  activeRange?: "today" | "week" | "month" | "all" | null;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterOpenRequest?: number;
  columns: (row: VehicleRecord) => string[];
  cellValue: (row: VehicleRecord, column: string) => unknown;
  displayValue: (value: unknown) => string;
}>();

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});
function formatCurrency(value: number | undefined) {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

const emit = defineEmits<{
  add: [];
  edit: [row: VehicleRecord];
  remove: [row: VehicleRecord];
  viewMaintenance: [row: VehicleRecord];
  viewExpense: [row: VehicleRecord];
  navigateSource: [row: VehicleRecord];
  viewDocument: [row: VehicleRecord];
  viewPhoto: [row: VehicleRecord];
  applyFilters: [];
  resetFilters: [];
  setDateRange: [range: "today" | "week" | "month" | "all"];
  sort: [column: string];
  filterOpened: [];
  "update:page": [value: number];
  "update:perPage": [value: number];
}>();
const filtersOpen = ref(false);
watch(
  () => props.resource,
  (resource, previousResource) => {
    if (previousResource && previousResource !== resource) {
      filtersOpen.value = false;
    }
  },
);
watch(
  () => [props.filterOpenRequest, props.resource] as const,
  ([request, resource]) => {
    if (request && ["maintenance", "expenses", "fuel"].includes(resource)) {
      filtersOpen.value = true;
      emit("filterOpened");
    }
  },
  { immediate: true },
);
const sortableMaintenanceColumns = new Set([
  "performed_by_name",
  "service_provider",
  "service_date",
  "mileage",
  "maintenance_type",
]);
const sortableExpenseColumns = new Set([
  "category",
  "amount",
  "expense_date",
  "vendor",
  "recorded_by_name",
]);
const sortableFuelColumns = new Set([
  "recorded_by_name",
  "fuel_date",
  "mileage",
  "liters",
  "price_per_liter",
  "total_amount",
]);
</script>

<template>
  <section>
    <div class="subpage-head">
      <div>
        <h2>{{ title }}</h2>
        <p>Complete history for this vehicle.</p>
      </div>
      <button v-if="canCreate" class="btn btn-primary" @click="emit('add')">
        <Plus />Add record
      </button>
    </div>
    <div v-if="['maintenance', 'expenses', 'fuel'].includes(resource) && filters" class="maintenance-filter-section">
      <button
        type="button"
        class="filter-toggle"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        <span><Filter />Filters</span>
        <ChevronDown :class="{ rotated: filtersOpen }" />
      </button>
      <Transition name="filter-collapse">
      <div v-if="filtersOpen" class="record-filters">
        <div class="quick-date-filters" aria-label="Quick date filters">
        <button
          v-for="option in ([['today', 'Today'], ['week', '1 Week'], ['month', '1 Month'], ['all', 'All']] as const)"
          :key="option[0]"
          type="button"
          :class="['filter-chip', { active: activeRange === option[0] }]"
          @click="emit('setDateRange', option[0])"
        >
          {{ option[1] }}
        </button>
        </div>
        <div class="record-filter-fields">
        <label>Record ID<input v-model="filters.recordId" type="number" min="1" /></label>
        <label>From<input v-model="filters.from" type="date" /></label>
        <label>To<input v-model="filters.to" type="date" /></label>
        <template v-if="resource === 'maintenance'">
          <label>Performed by<input v-model="filters.performedBy" type="search" /></label>
          <label>Service provider<input v-model="filters.serviceProvider" type="search" /></label>
          <label>Maintenance type<input v-model="filters.maintenanceType" type="search" /></label>
        </template>
        <template v-else-if="resource === 'expenses'">
          <label>Category<input v-model="filters.category" type="search" /></label>
          <label>Vendor<input v-model="filters.vendor" type="search" /></label>
          <label>Recorded by<input v-model="filters.recordedBy" type="search" /></label>
        </template>
        <template v-else>
          <label>Recorded by<input v-model="filters.recordedBy" type="search" /></label>
        </template>
          <button type="button" class="btn" @click="emit('resetFilters')">
            <RotateCcw aria-hidden="true" /> Reset
          </button>
          <button type="button" class="btn btn-primary" @click="emit('applyFilters')">
            Apply
          </button>
        </div>
      </div>
      </Transition>
    </div>
    <div
      v-if="['maintenance', 'expenses', 'fuel'].includes(resource) && !loading"
      class="record-total-grid"
      aria-label="Record amount totals"
    >
      <article class="record-total-card">
        <span class="record-total-icon record-total-icon--page"><ReceiptText /></span>
        <div class="record-total-content">
          <span class="record-total-label">Page total</span>
          <strong>{{ formatCurrency(pageAmountTotal) }}</strong>
          <small>{{ rows.length }} {{ rows.length === 1 ? "record" : "records" }} on this page</small>
        </div>
      </article>
      <article class="record-total-card record-total-card--overall">
        <span class="record-total-icon record-total-icon--overall"><TrendingUp /></span>
        <div class="record-total-content">
          <span class="record-total-label">Overall total</span>
          <strong>{{ formatCurrency(overallAmountTotal) }}</strong>
          <small>{{ meta?.total ?? rows.length }} matching {{ (meta?.total ?? rows.length) === 1 ? "record" : "records" }}</small>
        </div>
      </article>
    </div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" :title="`No ${resource} records`" />
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="column in columns(rows[0])" :key="column">
                <button
                  v-if="(resource === 'maintenance' && sortableMaintenanceColumns.has(column)) || (resource === 'expenses' && sortableExpenseColumns.has(column)) || (resource === 'fuel' && sortableFuelColumns.has(column))"
                  type="button"
                  class="sort-heading"
                  :class="{ active: sortBy === column }"
                  :aria-label="`Sort by ${column.replaceAll('_', ' ')}`"
                  @click="emit('sort', column)"
                >
                  <span>{{ column.replaceAll("_", " ") }}</span>
                  <ArrowUp v-if="sortBy === column && sortDirection === 'asc'" />
                  <ArrowDown v-else-if="sortBy === column && sortDirection === 'desc'" />
                  <ArrowUpDown v-else />
                </button>
                <template v-else>{{
                  column === "assigned_to_name"
                    ? "Assigned to"
                    : column === "issue_date"
                      ? "Acquired date"
                      : column === "file_path"
                        ? "File"
                        : column.replaceAll("_", " ")
                }}</template>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td v-for="column in columns(row)" :key="column">
                <button
                  v-if="column === 'file_path' && row[column]"
                  class="table-action"
                  @click="emit('viewDocument', row)"
                >
                  <Eye />View
                </button>
                <button
                  v-else-if="column === 'photo' && row[column]"
                  class="table-action"
                  @click="emit('viewPhoto', row)"
                >
                  <Eye />View photo
                </button>
                <button
                  v-else-if="
                    column === 'source' &&
                    (row.maintenance_record_id || row.fuel_log_id)
                  "
                  class="source-link"
                  @click="emit('navigateSource', row)"
                >
                  {{ displayValue(cellValue(row, column)) }}
                </button>
                <template v-else>{{
                  displayValue(cellValue(row, column))
                }}</template>
              </td>
              <td>
                <div class="row-actions">
                  <button
                    v-if="resource === 'maintenance'"
                    class="icon-btn"
                    title="View full information"
                    @click="emit('viewMaintenance', row)"
                  >
                    <Eye /></button
                  ><button
                    v-if="resource === 'expenses'"
                    class="icon-btn"
                    title="View expense"
                    @click="emit('viewExpense', row)"
                  >
                    <Eye /></button
                  ><button
                    v-if="canUpdate"
                    class="icon-btn"
                    title="Edit record"
                    @click="emit('edit', row)"
                  >
                    <Pencil /></button
                  ><button
                    v-if="canDelete"
                    class="icon-btn danger"
                    title="Delete record"
                    :disabled="deletingId === row.id"
                    @click="emit('remove', row)"
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
        v-if="meta"
        :meta="meta"
        :page="page"
        :per-page="perPage"
        @update:page="emit('update:page', $event)"
        @update:per-page="emit('update:perPage', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.record-filters {
  padding: 10px 12px 12px;
  border-top: 1px solid #dfe5ea;
}
.maintenance-filter-section {
  margin-bottom: 12px;
  border: 1px solid #dfe5ea;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.filter-toggle { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 9px 12px; border: 0; background: #fff; color: #334155; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.filter-toggle span { display: flex; align-items: center; gap: 6px; }
.filter-toggle svg { width: 16px; transition: transform .2s ease; }
.filter-toggle svg.rotated { transform: rotate(180deg); }
.filter-collapse-enter-active,
.filter-collapse-leave-active { transition: max-height .28s ease, opacity .2s ease, transform .28s ease; overflow: hidden; }
.filter-collapse-enter-from,
.filter-collapse-leave-to { max-height: 0; opacity: 0; transform: translateY(-6px); }
.filter-collapse-enter-to,
.filter-collapse-leave-from { max-height: 320px; opacity: 1; transform: translateY(0); }
.quick-date-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 9px; }
.quick-date-filters .filter-chip { padding: 5px 10px; font-size: 11px; }
.record-filter-fields { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 8px 10px; align-items: end; }
.record-filter-fields label { gap: 4px; font-size: 12px; }
.record-filter-fields input { width: 100%; min-width: 0; min-height: 36px; border: 1px solid #d9e0e6; border-radius: 7px; padding: 7px 9px; background: #fff; font-size: 13px; }
.record-filter-fields .btn { min-height: 36px; padding-top: 7px; padding-bottom: 7px; font-size: 13px; }
.sort-heading { display: inline-flex; align-items: center; gap: 5px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
.sort-heading:hover, .sort-heading.active { color: #0f9187; }
.sort-heading svg { width: 13px; height: 13px; }
.record-total-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 14px;
}
.record-total-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 15px 17px;
  border: 1px solid #dce4ec;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff 0%, #f7fbff 100%);
  box-shadow: 0 5px 16px rgb(15 23 42 / 5%);
}
.record-total-card--overall { background: linear-gradient(135deg, #fff 0%, #fffbf2 100%); }
.record-total-icon {
  display: grid;
  place-items: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: 11px;
}
.record-total-icon svg { width: 21px; height: 21px; }
.record-total-icon--page { color: #2563eb; background: #eaf2ff; }
.record-total-icon--overall { color: #c87908; background: #fff1d4; }
.record-total-content { display: flex; flex-direction: column; min-width: 0; }
.record-total-label { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.record-total-content strong { margin-top: 2px; color: #14213d; font-size: 22px; line-height: 1.15; }
.record-total-content small { margin-top: 3px; color: #7b8798; font-size: 12px; }
@media (max-width: 1050px) { .record-filter-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 800px) { .record-filter-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .record-total-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .record-filter-fields { grid-template-columns: 1fr; } }
</style>
