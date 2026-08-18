<script setup lang="ts">
import { ArrowLeft, Plus } from "lucide-vue-next";
import EmptyState from "../components/EmptyState.vue";
import LoadingState from "../components/LoadingState.vue";
import PageHeader from "../components/PageHeader.vue";
import { PLAN_BENEFITS } from "../features/plans/constants.ts";
import PlanPurchaseView from "../features/plans/components/PlanPurchaseView.vue";
import PlanTransactionsTable from "../features/plans/components/PlanTransactionsTable.vue";
import TransactionDetailsModal from "../features/plans/components/TransactionDetailsModal.vue";
import TransactionPaymentModal from "../features/plans/components/TransactionPaymentModal.vue";
import { usePlanTransactions } from "../features/plans/composables/usePlanTransactions.ts";

const {
  transactions,
  selectedTransaction,
  paymentTransaction,
  paymentQrUrl,
  meta,
  page,
  perPage,
  loading,
  loadingPaymentQr,
  submittingPayment,
  error,
  purchaseOpen,
  paymentMethods,
  purchasing,
  preview,
  loadingPreview,
  currentSubscription,
  purchaseForm,
  planGroups,
  selectedOffering,
  selectedPaymentMethod,
  openPurchase,
  closePurchase,
  purchasePlan,
  viewTransaction,
  closeTransaction,
  openPayment,
  closePayment,
  submitPayment,
} = usePlanTransactions();
</script>

<template>
  <div>
    <PageHeader
      :title="purchaseOpen ? 'Purchase a plan' : 'Plan transactions'"
      :description="
        purchaseOpen
          ? 'Compare plans, choose your billing period, and save more with longer subscriptions.'
          : 'Review subscriptions, complete pending payments, and track payment verification.'
      "
    >
      <button
        v-if="purchaseOpen"
        class="btn"
        type="button"
        @click="closePurchase"
      >
        <ArrowLeft />
        Back to transactions
      </button>

      <button
        v-else
        class="btn btn-primary"
        type="button"
        @click="openPurchase"
      >
        <Plus />
        Purchase plan
      </button>
    </PageHeader>

    <div v-if="error" class="alert error">{{ error }}</div>

    <LoadingState v-if="loading" />

    <PlanPurchaseView
      v-else-if="purchaseOpen"
      :plan-groups="planGroups"
      :benefits="PLAN_BENEFITS"
      :selected-offering-id="purchaseForm.subscription_plan_offering_id"
      :selected-offering="selectedOffering"
      :payment-methods="paymentMethods"
      :selected-payment-method="selectedPaymentMethod"
      :payment-method-id="purchaseForm.payment_method_id"
      :purchasing="purchasing"
      :preview="preview"
      :loading-preview="loadingPreview"
      :current-subscription="currentSubscription"
      @update:selected-offering-id="
        purchaseForm.subscription_plan_offering_id = $event
      "
      @update:payment-method-id="purchaseForm.payment_method_id = $event"
      @purchase="purchasePlan"
    />

    <EmptyState
      v-else-if="!transactions.length"
      title="No plan transactions"
      message="Your plan purchases and renewals will appear here."
    />

    <PlanTransactionsTable
      v-else
      v-model:page="page"
      v-model:per-page="perPage"
      :transactions="transactions"
      :meta="meta"
      @view="viewTransaction"
      @pay="openPayment"
    />

    <TransactionDetailsModal
      v-if="selectedTransaction"
      :transaction="selectedTransaction"
      @close="closeTransaction"
    />

    <TransactionPaymentModal
      v-if="paymentTransaction"
      :transaction="paymentTransaction"
      :qr-url="paymentQrUrl"
      :loading-qr="loadingPaymentQr"
      :submitting="submittingPayment"
      @close="closePayment"
      @submit="submitPayment"
    />
  </div>
</template>
