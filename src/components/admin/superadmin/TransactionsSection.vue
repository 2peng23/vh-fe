<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ChevronDown, Filter, RotateCcw, ShieldCheck } from "lucide-vue-next";
import api, { errorMessage } from "../../../api/client";
import type { ApiEnvelope, PaginationMeta } from "../../../types";
import type { AdminBusiness, AdminPaymentMethod } from "../../../types/admin";
import EmptyState from "../../EmptyState.vue";
import LoadingState from "../../LoadingState.vue";
import AdminTransactionReviewModal from "./transactions/AdminTransactionReviewModal.vue";
import AdminTransactionsTable from "./transactions/AdminTransactionsTable.vue";
import type {
  PaymentReviewPayload,
  ReviewableAdminTransaction,
} from "./transactions/types";

const emit = defineEmits<{ openBusiness: [business: AdminBusiness] }>();

const rows = ref<ReviewableAdminTransaction[]>([]);
const meta = ref<PaginationMeta>();
const paymentMethods = ref<AdminPaymentMethod[]>([]);
const selectedTransaction = ref<ReviewableAdminTransaction | null>(null);
const proofUrl = ref<string | null>(null);
const proofContentType = ref<string | null>(null);
const loadingProof = ref(false);
const reviewingPayment = ref(false);
const loading = ref(true);
const error = ref("");
const search = ref("");
const filtersExpanded = ref(false);
const activeRange = ref<"today" | "week" | "month" | "all" | null>("all");
const page = ref(1);
const perPage = ref(20);

const filters = reactive({
  plan: "",
  payment_status: "",
  status: "",
  payment_method: "",
  date_from: "",
  date_to: "",
});

// Load payment methods once for the payment-method filter.
async function loadPaymentMethods() {
  if (paymentMethods.value.length) return;

  const { data } = await api.get<ApiEnvelope<AdminPaymentMethod[]>>(
    "/superadmin/payment-methods",
  );

  paymentMethods.value = data.data;
}

// Load superadmin transactions using the current filters and pagination.
async function load() {
  loading.value = true;
  error.value = "";

  try {
    await loadPaymentMethods();

    const { data } = await api.get<ApiEnvelope<ReviewableAdminTransaction[]>>(
      "/superadmin/transactions",
      {
        params: {
          search: search.value,
          ...filters,
          page: page.value,
          per_page: perPage.value,
        },
      },
    );

    rows.value = data.data;
    meta.value = data.meta;

    // Keep the open review modal synchronized after a refresh.
    if (selectedTransaction.value) {
      const refreshed = rows.value.find(
        (transaction) => transaction.id === selectedTransaction.value?.id,
      );

      if (refreshed) selectedTransaction.value = refreshed;
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

// Convert a Date to YYYY-MM-DD using the browser's local timezone.
function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// Apply the current filter form and return to the first result page.
function applyFilters() {
  if (filters.date_from && !filters.date_to) {
    filters.date_to = filters.date_from;
  }

  if (filters.date_to && !filters.date_from) {
    filters.date_from = filters.date_to;
  }

  if (filters.date_from && filters.date_from === filters.date_to) {
    activeRange.value = filters.date_from === localDate(new Date()) ? "today" : null;
  }

  if (page.value === 1) load();
  else page.value = 1;
}

// Reset all transaction filters to their default values.
function resetFilters() {
  search.value = "";

  Object.assign(filters, {
    plan: "",
    payment_status: "",
    status: "",
    payment_method: "",
    date_from: "",
    date_to: "",
  });

  activeRange.value = "all";
  error.value = "";

  if (page.value === 1) load();
  else page.value = 1;
}

// Apply a quick date range to the transaction report.
function setDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);

  if (range === "week") start.setDate(start.getDate() - 7);
  if (range === "month") start.setMonth(start.getMonth() - 1);

  filters.date_from = range === "all" ? "" : localDate(start);
  filters.date_to = range === "all" ? "" : localDate(end);
  activeRange.value = range;
  applyFilters();
}

// Release the private payment-proof blob when it is no longer needed.
function revokeProofUrl() {
  if (proofUrl.value) URL.revokeObjectURL(proofUrl.value);

  proofUrl.value = null;
  proofContentType.value = null;
}

// Load the private payment proof uploaded by the owner.
async function loadPaymentProof(transaction: ReviewableAdminTransaction) {
  revokeProofUrl();

  // No file was uploaded, so the payment can still be reviewed by reference number.
  if (!transaction.payment_proof_path) return;

  loadingProof.value = true;

  try {
    const response = await api.get(
      `/superadmin/transactions/${transaction.id}/payment-proof`,
      { responseType: "blob" },
    );

    proofContentType.value = response.headers["content-type"] || response.data?.type || null;
    proofUrl.value = URL.createObjectURL(response.data);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loadingProof.value = false;
  }
}

// Open the modern payment-review modal and load any attached private proof.
async function openPaymentReview(transaction: ReviewableAdminTransaction) {
  selectedTransaction.value = transaction;
  error.value = "";
  await loadPaymentProof(transaction);
}

// Close payment review and release the temporary proof object URL.
function closePaymentReview() {
  selectedTransaction.value = null;
  revokeProofUrl();
}

// Approve or reject the owner's submitted payment confirmation.
async function reviewPayment(payload: PaymentReviewPayload) {
  if (!selectedTransaction.value) return;

  reviewingPayment.value = true;
  error.value = "";

  try {
    const { data } = await api.put<ApiEnvelope<ReviewableAdminTransaction>>(
      `/superadmin/transactions/${selectedTransaction.value.id}/payment-review`,
      payload,
    );

    const index = rows.value.findIndex(
      (transaction) => transaction.id === data.data.id,
    );

    if (index >= 0) rows.value.splice(index, 1, data.data);

    selectedTransaction.value = data.data;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    reviewingPayment.value = false;
  }
}

// Open the existing business details view from the table or review modal.
function openBusiness(transaction: ReviewableAdminTransaction) {
  if (transaction.business) emit("openBusiness", transaction.business);
}

watch(page, load);

// Reset to page one when the page size changes without making duplicate requests.
watch(perPage, () => {
  if (page.value === 1) load();
  else page.value = 1;
});

onMounted(load);
onBeforeUnmount(revokeProofUrl);
</script>

<template>
  <div class="transaction-section">
    <div class="transaction-section-head">
      <div>
        <span class="section-eyebrow">PAYMENT OPERATIONS</span>
        <h2>Plan transactions</h2>
        <p>
          Review owner payments, verify submitted proof, and manage subscription transactions.
        </p>
      </div>

      <div class="review-summary" v-if="meta">
        <ShieldCheck :size="16" />
        <span><strong>{{ meta.total }}</strong> total transactions</span>
      </div>
    </div>

    <div class="transaction-report-filters">
      <button
        type="button"
        class="transaction-report-filter-toggle"
        :aria-expanded="filtersExpanded"
        aria-controls="transaction-filter-content"
        @click="filtersExpanded = !filtersExpanded"
      >
        <span><Filter aria-hidden="true" /> Filters</span>
        <ChevronDown aria-hidden="true" :class="{ rotated: filtersExpanded }" />
      </button>

      <Transition name="filter-panel">
        <div
          v-if="filtersExpanded"
          id="transaction-filter-content"
          class="transaction-report-filter-content"
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

          <form
            class="transaction-report-filter-fields"
            @submit.prevent="applyFilters"
          >
            <label>
              From
              <input
                v-model="filters.date_from"
                type="date"
                :max="filters.date_to || undefined"
                @input="activeRange = null"
              />
            </label>

            <label>
              To
              <input
                v-model="filters.date_to"
                type="date"
                :min="filters.date_from || undefined"
                @input="activeRange = null"
              />
            </label>

            <label>
              Plan
              <select v-model="filters.plan">
                <option value="">All plans</option>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label>
              Payment
              <select v-model="filters.payment_status">
                <option value="">All payment statuses</option>
                <option value="pending_verification">Pending verification</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
                <option value="unpaid">Payment required</option>
              </select>
            </label>

            <label>
              Transaction
              <select v-model="filters.status">
                <option value="">All transaction statuses</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label>
              Payment method
              <select v-model="filters.payment_method">
                <option value="">All methods</option>
                <option
                  v-for="method in paymentMethods"
                  :key="method.id"
                  :value="method.name"
                >
                  {{ method.name }}
                </option>
              </select>
            </label>

            <label class="transaction-report-filter-search">
              Search
              <input
                v-model.trim="search"
                type="search"
                autocomplete="off"
                placeholder="Business, email, reference or plan"
                @keydown.enter="applyFilters"
              />
            </label>

            <div class="transaction-report-filter-actions">
              <button type="button" class="btn" @click="resetFilters">
                <RotateCcw aria-hidden="true" />
                Reset
              </button>

              <button type="submit" class="btn btn-primary">Apply</button>
            </div>
          </form>
        </div>
      </Transition>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="!rows.length"
      title="No transactions found"
      message="Transactions matching your current filters will appear here."
    />

    <AdminTransactionsTable
      v-else
      :transactions="rows"
      :meta="meta"
      :page="page"
      :per-page="perPage"
      @update:page="page = $event"
      @update:per-page="perPage = $event"
      @review="openPaymentReview"
      @view="openPaymentReview"
      @open-business="openBusiness"
    />

    <AdminTransactionReviewModal
      v-if="selectedTransaction"
      :transaction="selectedTransaction"
      :proof-url="proofUrl"
      :proof-content-type="proofContentType"
      :loading-proof="loadingProof"
      :reviewing="reviewingPayment"
      @close="closePaymentReview"
      @review="reviewPayment"
      @open-business="openBusiness"
    />
  </div>
</template>

<style scoped>
.transaction-section {
  display: grid;
  gap: 16px;
}

.transaction-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.section-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #0f766e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.transaction-section-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
}

.transaction-section-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

.review-summary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 999px;
  font-size: 10px;
  white-space: nowrap;
}

.review-summary strong {
  font-weight: 900;
}

.transaction-report-filters {
  padding: 0;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.transaction-report-filter-toggle {
  width: 100%;
  padding: 13px 16px;
  color: #334155;
  background: #ffffff;
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
}

.transaction-report-filter-toggle > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.transaction-report-filter-toggle svg {
  width: 16px;
  height: 16px;
  transition: transform 0.22s ease;
}

.transaction-report-filter-toggle svg.rotated {
  transform: rotate(180deg);
}

.transaction-report-filter-content {
  padding: 15px 16px 17px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
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
  max-height: 520px;
  opacity: 1;
  transform: translateY(0);
}

.quick-date-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}

.transaction-report-filter-fields {
  display: grid;
  grid-template-columns:
    minmax(140px, 180px)
    minmax(140px, 180px)
    minmax(160px, 200px)
    minmax(180px, 220px);
  gap: 12px;
  align-items: end;
}

.transaction-report-filter-fields label {
  color: #475569;
  font-size: 10px;
  font-weight: 700;
}

.transaction-report-filter-fields input,
.transaction-report-filter-fields select {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  margin-top: 6px;
  padding: 9px 10px;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #dbe3ed;
  border-radius: 9px;
  outline: 0;
  font: inherit;
  font-size: 10px;
}

.transaction-report-filter-fields input:focus,
.transaction-report-filter-fields select:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}

.transaction-report-filter-search {
  grid-column: span 2;
}

.transaction-report-filter-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.transaction-report-filter-actions .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
}

.transaction-report-filter-actions svg {
  width: 15px;
  height: 15px;
}

@media (max-width: 900px) {
  .transaction-section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .transaction-report-filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .transaction-report-filter-search {
    grid-column: auto;
  }
}

@media (max-width: 560px) {
  .transaction-report-filter-fields {
    grid-template-columns: 1fr;
  }

  .transaction-report-filter-actions {
    flex-direction: column;
  }

  .transaction-report-filter-actions .btn {
    width: 100%;
  }
}
</style>
