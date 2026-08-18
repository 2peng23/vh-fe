<script setup lang="ts">
import { ref, watch } from "vue";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Eye,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-vue-next";
import EmptyState from "../EmptyState.vue";
import LoadingState from "../LoadingState.vue";
import PaginationControls from "../PaginationControls.vue";
import type { PaginationMeta } from "../../types";
import { formatCurrency } from "../../utils";

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
    <div
      class="subpage-head"
      :style="{
        justifyContent: ['maintenance', 'expenses', 'fuel'].includes(resource)
          ? 'flex-end'
          : 'space-between',
      }"
    >
      <div v-if="!['maintenance', 'expenses', 'fuel'].includes(resource)">
        <h2>{{ title }}</h2>
        <p>Complete history for this vehicle.</p>
      </div>

      <button v-if="canCreate" class="btn btn-primary" @click="emit('add')">
        <Plus />
        Add record
      </button>
    </div>
    <div
      v-if="['maintenance', 'expenses', 'fuel'].includes(resource) && filters"
      class="maintenance-filter-section"
    >
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
              v-for="option in [
                ['today', 'Today'],
                ['week', '1 Week'],
                ['month', '1 Month'],
                ['all', 'All'],
              ] as const"
              :key="option[0]"
              type="button"
              :class="['filter-chip', { active: activeRange === option[0] }]"
              @click="emit('setDateRange', option[0])"
            >
              {{ option[1] }}
            </button>
          </div>
          <div class="record-filter-fields">
            <label
              >Record ID<input v-model="filters.recordId" type="number" min="1"
            /></label>
            <label>From<input v-model="filters.from" type="date" /></label>
            <label>To<input v-model="filters.to" type="date" /></label>
            <template v-if="resource === 'maintenance'">
              <label
                >Performed by<input v-model="filters.performedBy" type="search"
              /></label>
              <label
                >Service provider<input
                  v-model="filters.serviceProvider"
                  type="search"
              /></label>
              <label
                >Maintenance type<input
                  v-model="filters.maintenanceType"
                  type="search"
              /></label>
            </template>
            <template v-else-if="resource === 'expenses'">
              <label
                >Category<input v-model="filters.category" type="search"
              /></label>
              <label
                >Vendor<input v-model="filters.vendor" type="search"
              /></label>
              <label
                >Recorded by<input v-model="filters.recordedBy" type="search"
              /></label>
            </template>
            <template v-else>
              <label
                >Recorded by<input v-model="filters.recordedBy" type="search"
              /></label>
            </template>
            <button type="button" class="btn" @click="emit('resetFilters')">
              <RotateCcw aria-hidden="true" /> Reset
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="emit('applyFilters')"
            >
              Apply
            </button>
          </div>
        </div>
      </Transition>
    </div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" :title="`No ${resource} records`" />
    <div v-else class="card table-card">
      <div
        v-if="['maintenance', 'expenses', 'fuel'].includes(resource)"
        class="card-head"
      >
        <div>
          <h2>{{ title }}</h2>
          <p>Complete history for this vehicle.</p>
        </div>

        <div class="totals-section">
          <div class="total-item">
            <small>PAGE TOTAL:</small>
            <strong>{{ formatCurrency(pageAmountTotal) }}</strong>
          </div>

          <div class="total-item">
            <small>OVERALL TOTAL:</small>
            <strong>{{ formatCurrency(overallAmountTotal) }}</strong>
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="column in columns(rows[0])" :key="column">
                <button
                  v-if="
                    (resource === 'maintenance' &&
                      sortableMaintenanceColumns.has(column)) ||
                    (resource === 'expenses' &&
                      sortableExpenseColumns.has(column)) ||
                    (resource === 'fuel' && sortableFuelColumns.has(column))
                  "
                  type="button"
                  class="sort-heading"
                  :class="{ active: sortBy === column }"
                  :aria-label="`Sort by ${column.replaceAll('_', ' ')}`"
                  @click="emit('sort', column)"
                >
                  <span>{{ column.replaceAll("_", " ") }}</span>
                  <ArrowUp
                    v-if="sortBy === column && sortDirection === 'asc'"
                  />
                  <ArrowDown
                    v-else-if="sortBy === column && sortDirection === 'desc'"
                  />
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
