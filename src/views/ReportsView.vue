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
import { formatCurrency, formatDate, localDate } from "../utils";
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
              <strong>{{ formatCurrency(currentPageTotal) }}</strong>
            </div>
            <div class="total-item">
              <small>OVERALL TOTAL: </small>
              <strong>{{ formatCurrency(allRecordsTotal) }}</strong>
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
                  <strong>{{ formatCurrency(r.amount) }}</strong>
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
