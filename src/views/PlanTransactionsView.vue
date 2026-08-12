<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowLeft, Check, Plus, QrCode, X } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { formatDate, formatDateTime } from "../utils/date";

const transactions = ref<any[]>([]), selected = ref<any | null>(null), qrPreview = ref<{ name: string; url: string } | null>(null), meta = ref<PaginationMeta>(), page = ref(1), perPage = ref(20), loading = ref(true), markingPaidId = ref<number | null>(null), error = ref("");
const purchaseOpen = ref(false), offerings = ref<any[]>([]), paymentMethods = ref<any[]>([]), purchasing = ref(false);
const purchaseForm = ref({ subscription_plan_offering_id: "", payment_method_id: "" });
const route = useRoute();
const router = useRouter();
const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const planBenefits = [
  "Complete vehicle records and lifecycle tracking",
  "Mileage and odometer history",
  "Maintenance records and service schedules",
  "Fuel and operating expense tracking",
  "Driver management and vehicle assignments",
  "Documents and expiration reminders",
  "Issue reporting and status tracking",
  "Reports and data export",
  "Staff accounts with per-user permissions",
  "Notifications, audit history, and owner support",
];

/** Group billing periods under their plan so every plan's complete benefits stay easy to compare. */
const planGroups = computed(() => {
  const groups = new Map<string, { name: string; vehicleLimit: number; details: string; offerings: any[] }>();
  offerings.value.forEach((offering) => {
    const key = String(offering.name);
    const group: { name: string; vehicleLimit: number; details: string; offerings: any[] } = groups.get(key) || {
      name: offering.name,
      vehicleLimit: offering.vehicle_limit,
      details: offering.details,
      offerings: [],
    };
    group.offerings.push(offering);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    ...group,
    offerings: group.offerings.sort((a, b) => a.duration_months - b.duration_months),
  }));
});

/** Return the complete payment account currently selected for checkout. */
const selectedPaymentMethod = computed(() => paymentMethods.value.find((method) => String(method.id) === purchaseForm.value.payment_method_id));

/** Load the authenticated owner's tenant-scoped transaction history. */
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>("/plan-transactions", { params: { page: page.value, per_page: perPage.value } });
    transactions.value = data.data;
    meta.value = data.meta;
    const linkedTransactionId = Number(route.query.transaction);
    if (linkedTransactionId && selected.value?.id !== linkedTransactionId) {
      await viewTransaction({ id: linkedTransactionId });
    }
    if (route.query.purchase === "1" && !purchaseOpen.value) await openPurchase();
  } catch (e) { error.value = errorMessage(e); } finally { loading.value = false; }
}

/** Load available plans and payment accounts before opening checkout. */
async function openPurchase() {
  error.value = "";
  try {
    if (!offerings.value.length) {
      const [plans, methods] = await Promise.all([api.get<ApiEnvelope<any[]>>("/plan-offerings"), api.get<ApiEnvelope<any[]>>("/payment-methods")]);
      offerings.value = plans.data.data;
      paymentMethods.value = methods.data.data;
      purchaseForm.value = { subscription_plan_offering_id: String(offerings.value[0]?.id || ""), payment_method_id: String(paymentMethods.value[0]?.id || "") };
    }
    purchaseOpen.value = true;
    if (route.query.purchase !== "1") {
      await router.replace({ query: { ...route.query, purchase: "1" } });
    }
  } catch (e) {
    error.value = errorMessage(e);
  }
}

/** Return to transaction history and remove the checkout state from the URL. */
async function closePurchase() {
  purchaseOpen.value = false;
  const query = { ...route.query };
  delete query.purchase;
  await router.replace({ query });
}

/** Create a processing transaction using the selected configured offering. */
async function purchasePlan() {
  purchasing.value = true;
  error.value = "";
  try {
    await api.post("/plan-transactions", purchaseForm.value);
    await closePurchase();
    await load();
  } catch (e) { error.value = errorMessage(e); } finally { purchasing.value = false; }
}

/** Load and display complete details for the selected transaction. */
async function viewTransaction(transaction: any) {
  const { data } = await api.get<ApiEnvelope<any>>(`/plan-transactions/${transaction.id}`);
  selected.value = data.data;
}

/** Declare that payment was sent, then synchronize the list and detail modal. */
async function markAsPaid(transaction: any) {
  if (transaction.payment_status === "paid") return;
  markingPaidId.value = transaction.id;
  error.value = "";
  try {
    const { data } = await api.put<ApiEnvelope<any>>(`/plan-transactions/${transaction.id}/mark-paid`);
    const index = transactions.value.findIndex((transaction) => transaction.id === data.data.id);
    if (index >= 0) transactions.value.splice(index, 1, data.data);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    markingPaidId.value = null;
  }
}

/** Load a private payment QR and display it without leaving the transaction page. */
async function viewPaymentQr(transaction: any) {
  closeQrPreview();
  try {
    const response = await api.get(`/plan-transactions/${transaction.id}/payment-qr`, { responseType: "blob" });
    qrPreview.value = {
      name: transaction.selected_payment_method?.name || transaction.payment_method,
      url: URL.createObjectURL(response.data),
    };
  } catch (e) {
    error.value = errorMessage(e);
  }
}

/** Close the QR modal and release its temporary browser URL. */
function closeQrPreview() {
  if (qrPreview.value?.url) URL.revokeObjectURL(qrPreview.value.url);
  qrPreview.value = null;
}

onMounted(load);
onBeforeUnmount(closeQrPreview);
watch(page, load);
watch(perPage, () => { page.value = 1; load(); });
</script>

<template>
  <div>
    <PageHeader
      :title="purchaseOpen ? 'Purchase a plan' : 'Plan transactions'"
      :description="purchaseOpen ? 'Compare every plan benefit, select a billing period, and choose where to send your payment.' : 'Review your plan purchases, renewals, and payment status.'"
    >
      <button v-if="purchaseOpen" class="btn" type="button" @click="closePurchase"><ArrowLeft /> Back to transactions</button>
      <button v-else class="btn btn-primary" type="button" @click="openPurchase"><Plus /> Purchase plan</button>
    </PageHeader>
    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <section v-else-if="purchaseOpen" class="plan-purchase-page">
      <div class="plan-purchase-intro">
        <div>
          <span class="eyebrow">Choose your plan</span>
          <h2>Everything needed to manage your fleet</h2>
          <p>Every paid plan includes the complete Vehicle Hub feature set. Choose the vehicle capacity and billing period that fit your business.</p>
        </div>
      </div>

      <div class="plan-tier-grid">
        <article v-for="group in planGroups" :key="group.name" class="plan-tier-card">
          <header>
            <div>
              <h3>{{ group.name }}</h3>
              <p>{{ group.details }}</p>
            </div>
            <strong>{{ group.vehicleLimit }} vehicles</strong>
          </header>

          <ul class="plan-benefits">
            <li v-for="benefit in planBenefits" :key="benefit"><Check :size="16" /> <span>{{ benefit }}</span></li>
          </ul>

          <div class="plan-period-options">
            <label
              v-for="offering in group.offerings"
              :key="offering.id"
              class="plan-period-option"
              :class="{ selected: String(offering.id) === purchaseForm.subscription_plan_offering_id }"
            >
              <input v-model="purchaseForm.subscription_plan_offering_id" type="radio" :value="String(offering.id)" />
              <span>{{ offering.duration_months === 12 ? '1 year' : `${offering.duration_months} month${offering.duration_months > 1 ? 's' : ''}` }}</span>
              <strong>{{ currency.format(Number(offering.price)) }}</strong>
            </label>
          </div>
        </article>
      </div>

      <div class="plan-purchase-checkout card">
        <div class="plan-payment-field">
          <label for="purchase-payment-method">Payment method</label>
          <select id="purchase-payment-method" v-model="purchaseForm.payment_method_id" required>
            <option v-for="method in paymentMethods" :key="method.id" :value="String(method.id)">{{ method.name }} — {{ method.account_name }} — {{ method.account_number }}</option>
          </select>
          <p v-if="selectedPaymentMethod">Payment will be sent to {{ selectedPaymentMethod.account_name }} ({{ selectedPaymentMethod.account_number }}).</p>
          <p v-else class="error-text">No payment method is currently available. Please contact support.</p>
        </div>
        <button class="btn btn-primary" type="button" :disabled="purchasing || !purchaseForm.subscription_plan_offering_id || !purchaseForm.payment_method_id" @click="purchasePlan">
          {{ purchasing ? 'Creating transaction…' : 'Continue with selected plan' }}
        </button>
      </div>
    </section>
    <EmptyState v-else-if="!transactions.length" title="No plan transactions" message="Your plan purchases and renewals will appear here." />
    <div v-else class="card table-card"><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Payment method</th><th>Payment status</th><th>Transaction status</th><th>Action</th></tr></thead><tbody><tr v-for="transaction in transactions" :key="transaction.id" class="clickable-row" @click="viewTransaction(transaction)"><td><strong>{{ transaction.reference }}</strong></td><td class="capitalize">{{ transaction.plan }}</td><td>{{ currency.format(Number(transaction.amount)) }}</td><td><strong>{{ transaction.selected_payment_method?.name || transaction.payment_method }}</strong><small class="cell-small">{{ transaction.selected_payment_method?.account_name || '—' }}</small><small class="cell-small">{{ transaction.selected_payment_method?.account_number || '—' }}</small><button v-if="transaction.selected_payment_method?.qr_path" type="button" class="table-text-button" @click.stop="viewPaymentQr(transaction)"><QrCode :size="14" />View QR</button></td><td><StatusBadge :status="transaction.payment_status === 'paid' ? 'Paid' : 'Not paid'" /></td><td><StatusBadge :status="transaction.status" /></td><td><div class="row-actions"><button v-if="transaction.payment_status !== 'paid'" type="button" class="btn btn-primary btn-small" :disabled="markingPaidId === transaction.id" @click.stop="markAsPaid(transaction)">{{ markingPaidId === transaction.id ? 'Saving…' : 'Mark as paid' }}</button><button type="button" class="btn btn-small" @click.stop="viewTransaction(transaction)">View</button></div></td></tr></tbody></table></div><PaginationControls v-if="meta" :meta="meta" v-model:page="page" v-model:per-page="perPage" /></div>
    <div v-if="selected" class="modal-backdrop" @click.self="selected = null"><section class="modal transaction-detail-modal"><div class="modal-head"><div><h2>Transaction details</h2><p>{{ selected.reference }}</p></div><button type="button" class="icon-btn" @click="selected = null"><X /></button></div><dl class="detail-list"><div><dt>Payment status</dt><dd><StatusBadge :status="selected.payment_status === 'paid' ? 'Paid' : 'Not paid'" /></dd></div><div><dt>Transaction status</dt><dd><StatusBadge :status="selected.status" /></dd></div><div><dt>Plan</dt><dd class="capitalize">{{ selected.plan }}</dd></div><div><dt>Amount</dt><dd>{{ currency.format(Number(selected.amount)) }}</dd></div><div><dt>Payment method</dt><dd>{{ selected.selected_payment_method?.name || selected.payment_method }}</dd></div><div><dt>Account name</dt><dd>{{ selected.selected_payment_method?.account_name || '—' }}</dd></div><div><dt>Account number</dt><dd>{{ selected.selected_payment_method?.account_number || '—' }}</dd></div><div><dt>Payment date</dt><dd>{{ formatDate(selected.paid_at) }}</dd></div><div><dt>Plan starts</dt><dd>{{ formatDate(selected.starts_at) }}</dd></div><div><dt>Plan ends</dt><dd>{{ formatDate(selected.ends_at) }}</dd></div><div><dt>Created</dt><dd>{{ formatDateTime(selected.created_at) }}</dd></div><div class="full"><dt>Notes</dt><dd>{{ selected.notes || '—' }}</dd></div></dl></section></div>
    <div v-if="qrPreview" class="modal-backdrop" @click.self="closeQrPreview"><section class="modal payment-qr-modal" role="dialog" aria-modal="true" :aria-label="`${qrPreview.name} QR code`"><div class="modal-head"><div><h2>{{ qrPreview.name }}</h2><p>Scan this QR code to make your payment.</p></div><button type="button" class="icon-btn" aria-label="Close QR preview" @click="closeQrPreview"><X /></button></div><div class="payment-qr-preview"><img :src="qrPreview.url" :alt="`${qrPreview.name} payment QR code`" /></div></section></div>
  </div>
</template>
