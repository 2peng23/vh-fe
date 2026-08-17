<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Filter,
  RotateCcw,
} from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDate } from "../utils/date";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const today = new Date();
const oneMonthAgo = new Date(today);
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
const initialRange = route.query.range === "all" ? "all" : "all";
const report = ref<any>({ rows: [], summary: [] }),
  page = ref(1),
  perPage = ref(20),
  activeRange = ref<"today" | "week" | "month" | "all" | null>(initialRange),
  loading = ref(true),
  error = ref(""),
  copiedVehicleCodeId = ref<number | null>(null),
  filtersExpanded = ref(false),
  filters = reactive({
    from: initialRange === "all" ? "" : localDate(oneMonthAgo),
    to: initialRange === "all" ? "" : localDate(today),
    category: "",
    vehicle_code: "",
  });
function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const currentPageTotal = computed(() =>
  report.value.rows.reduce(
    (total: number, expense: any) => total + Number(expense.amount || 0),
    0,
  ),
);
const allRecordsTotal = computed(() =>
  report.value.summary.reduce(
    (total: number, category: any) => total + Number(category.total || 0),
    0,
  ),
);
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any>>("/reports/expenses", {
      params: { ...filters, page: page.value, per_page: perPage.value },
    });
    report.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function applyFilters() {
  if (filters.from && !filters.to) filters.to = filters.from;
  if (filters.to && !filters.from) filters.from = filters.to;

  if (filters.from && filters.from === filters.to) {
    activeRange.value = filters.from === localDate(new Date()) ? "today" : null;
  }

  if (page.value === 1) load();
  else page.value = 1;
}

function resetFilters() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1);

  filters.from = "";
  filters.to = "";
  filters.category = "";
  filters.vehicle_code = "";
  activeRange.value = "all";
  error.value = "";

  if (page.value === 1) load();
  else page.value = 1;
}
function setDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);

  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);

  filters.from = range === "all" ? "" : localDate(start);
  filters.to = range === "all" ? "" : localDate(end);
  activeRange.value = range;
  applyFilters();
}
async function csv() {
  const response = await api.get("/reports/expenses", {
    params: { ...filters, format: "xlsx" },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  link.download = `vehicle-expenses-${timestamp}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
function openExpense(expense: any) {
  router.push({
    path: `/vehicles/${expense.vehicle_id}`,
    query: { tab: "expenses", expense: String(expense.id) },
  });
}
async function copyVehicleCode(expense: any) {
  const vehicleCode = expense.vehicle?.vehicle_code;
  if (!vehicleCode) return;

  try {
    await navigator.clipboard.writeText(vehicleCode);
    copiedVehicleCodeId.value = expense.id;
    window.setTimeout(() => {
      if (copiedVehicleCodeId.value === expense.id) {
        copiedVehicleCodeId.value = null;
      }
    }, 1800);
  } catch {
    error.value = "Unable to copy the vehicle code.";
  }
}
onMounted(load);
watch(page, load);
watch(perPage, () => {
  if (page.value === 1) load();
  else page.value = 1;
});
</script>
<template>
  <div>
    <PageHeader
      title="Reports"
      description="Understand vehicle spending and export business-ready reports."
      ><button v-if="auth.can('reports.export')" class="btn" @click="csv">
        <Download />Export
      </button></PageHeader
    >
    <div class="report-filters">
      <button
        type="button"
        class="report-filter-toggle"
        :aria-expanded="filtersExpanded"
        aria-controls="report-filter-content"
        @click="filtersExpanded = !filtersExpanded"
      >
        <span><Filter aria-hidden="true" /> Filters</span>
        <ChevronDown aria-hidden="true" :class="{ rotated: filtersExpanded }" />
      </button>

      <Transition name="filter-panel">
        <div
          v-if="filtersExpanded"
          id="report-filter-content"
          class="report-filter-content"
        >
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
              @click="setDateRange(option[0])"
            >
              {{ option[1] }}
            </button>
          </div>
          <div class="report-filter-fields">
            <label
              >From<input
                v-model="filters.from"
                type="date"
                @input="activeRange = null" /></label
            ><label
              >To<input
                v-model="filters.to"
                type="date"
                @input="activeRange = null" /></label
            ><label
              >Category<select
                v-model="filters.category"
                @change="applyFilters"
              >
                <option value="">All categories</option>
                <option
                  v-for="category in report.available_categories || []"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select></label
            ><label
              >Vehicle code<input
                v-model.trim="filters.vehicle_code"
                type="search"
                autocomplete="off"
                @keydown.enter="applyFilters"
            /></label>
            <div class="report-filter-actions">
              <button type="button" class="btn" @click="resetFilters">
                <RotateCcw aria-hidden="true" /> Reset
              </button>
              <button
                type="button"
                class="btn btn-primary"
                @click="applyFilters"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <div class="alert error" v-if="error">{{ error }}</div>
    <LoadingState v-if="loading" /><template v-else
      ><div class="card table-card">
        <div class="card-head">
          <div>
            <h2>Expense detail</h2>
            <p>{{ report.pagination?.total || 0 }} records in this period</p>
          </div>
          <div class="totals-section">
            <div class="total-item">
              <small>PAGE TOTAL: </small>
              <strong>{{ money.format(currentPageTotal) }}</strong>
            </div>
            <div class="total-item">
              <small>OVERALL TOTAL: </small>
              <strong>{{ money.format(allRecordsTotal) }}</strong>
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Vehicle Code</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in report.rows" :key="r.id">
                <td>{{ formatDate(r.expense_date) }}</td>
                <td>{{ r.vehicle?.plate_number || `#${r.vehicle_id}` }}</td>
                <td>
                  <div v-if="r.vehicle?.vehicle_code" class="vehicle-code-cell">
                    <span>{{ r.vehicle.vehicle_code }}</span>
                    <button
                      type="button"
                      class="copy-code-button"
                      :class="{ copied: copiedVehicleCodeId === r.id }"
                      :title="
                        copiedVehicleCodeId === r.id
                          ? 'Copied'
                          : 'Copy vehicle code'
                      "
                      :aria-label="
                        copiedVehicleCodeId === r.id
                          ? 'Vehicle code copied'
                          : `Copy vehicle code ${r.vehicle.vehicle_code}`
                      "
                      @click="copyVehicleCode(r)"
                    >
                      <Check
                        v-if="copiedVehicleCodeId === r.id"
                        aria-hidden="true"
                      />
                      <Copy v-else aria-hidden="true" />
                    </button>
                  </div>
                  <span v-else>—</span>
                </td>
                <td>{{ r.category }}</td>
                <td>{{ r.vendor || "—" }}</td>
                <td>
                  <strong>{{ money.format(+r.amount) }}</strong>
                </td>
                <td>
                  <button
                    type="button"
                    class="description-link"
                    @click="openExpense(r)"
                  >
                    view
                  </button>
                </td>
              </tr>
              <tr v-if="!report.rows.length">
                <td colspan="7" class="empty-cell">
                  No expenses found for this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationControls
          v-if="report.pagination"
          :meta="report.pagination"
          v-model:page="page"
          v-model:per-page="perPage"
        /></div
    ></template>
  </div>
</template>

<style scoped>
.description-link {
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  color: var(--teal);
  font-weight: 600;
}
.report-filters {
  padding: 0;
  overflow: hidden;
  margin-bottom: 5px;
}

.report-filter-toggle {
  width: 100%;
  padding: 14px 18px;
  border: 0;
  background: transparent;
  color: #24324a;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-filter-toggle > span {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.report-filter-toggle svg {
  width: 18px;
  height: 18px;
  transition: transform 0.22s ease;
}

.report-filter-toggle svg.rotated {
  transform: rotate(180deg);
}

.report-filter-content {
  padding: 16px 18px 18px;
  border-top: 1px solid #e3e8ee;
}

.filter-panel-enter-active,
.filter-panel-leave-active {
  overflow: hidden;
  transition:
    max-height 0.24s ease,
    opacity 0.18s ease,
    transform 0.2s ease;
}

.filter-panel-enter-from,
.filter-panel-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.filter-panel-enter-to,
.filter-panel-leave-from {
  max-height: 360px;
  opacity: 1;
  transform: translateY(0);
}

.quick-date-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}

.report-filter-fields {
  display: grid;
  grid-template-columns:
    minmax(140px, 180px) minmax(140px, 180px) minmax(170px, 210px)
    minmax(180px, 1fr);
  gap: 12px;
  align-items: end;
}

.report-filter-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.report-filter-actions .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
}

.report-filter-actions svg {
  width: 16px;
  height: 16px;
}

.report-filter-fields input,
.report-filter-fields select {
  width: 100%;
  min-width: 0;
  border: 1px solid #d9e0e6;
  background: #fff;
  border-radius: 7px;
  padding: 10px 11px;
  outline: 0;
}

@media (max-width: 900px) {
  .report-filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .report-filter-fields {
    grid-template-columns: 1fr;
  }

  .report-filter-actions {
    flex-direction: column;
  }

  .report-filter-actions .btn {
    width: 100%;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.totals-section {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.total-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.total-item small {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-item strong {
  font-size: 18px;
  font-weight: 700;
  color: #24324a;
}

@media (max-width: 768px) {
  .card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .totals-section {
    width: 100%;
    justify-content: flex-start;
    gap: 24px;
  }

  .total-item {
    text-align: left;
  }
}

.metric-card .metric-category {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.vehicle-link {
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.vehicle-link:hover,
.vehicle-link:focus-visible {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vehicle-code-cell {
  display: inline-grid;
  grid-template-columns: 7rem 28px;
  align-items: center;
  column-gap: 6px;
  min-height: 28px;
  vertical-align: middle;
  white-space: nowrap;
}

.vehicle-code-cell > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.copy-code-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  margin: 0;
  padding: 0;
  background: transparent;
  color: #718096;
  line-height: 0;
  vertical-align: middle;
  cursor: pointer;
}

.copy-code-button :deep(svg) {
  display: block;
  width: 17px;
  height: 17px;
}

.copy-code-button:hover,
.copy-code-button:focus-visible {
  background: var(--teal-soft);
  color: var(--teal-dark);
}

.copy-code-button.copied {
  color: var(--teal-dark);
}

.copy-code-button svg {
  width: 15px;
  height: 15px;
}
</style>
