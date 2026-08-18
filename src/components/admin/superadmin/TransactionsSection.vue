<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ChevronDown, Filter, RotateCcw } from "lucide-vue-next";
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
import { localDate } from "../../../utils";

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

// Apply the current filter form and return to the first result page.
function applyFilters() {
  if (filters.date_from && !filters.date_to) {
    filters.date_to = filters.date_from;
  }

  if (filters.date_to && !filters.date_from) {
    filters.date_from = filters.date_to;
  }

  if (filters.date_from && filters.date_from === filters.date_to) {
    activeRange.value =
      filters.date_from === localDate(new Date()) ? "today" : null;
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

    proofContentType.value =
      response.headers["content-type"] || response.data?.type || null;
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
                <option value="pending_verification">
                  Pending verification
                </option>
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
