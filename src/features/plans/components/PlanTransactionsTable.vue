<script setup lang="ts">
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Eye } from "lucide-vue-next";
import PaginationControls from "../../../components/PaginationControls.vue";
import StatusBadge from "../../../components/StatusBadge.vue";
import type { PaginationMeta } from "../../../types";
import type { PlanTransaction } from "../types";
import { formatPlanCurrency } from "../utils";

defineProps<{
  transactions: PlanTransaction[];
  meta?: PaginationMeta;
  page: number;
  perPage: number;
}>();

const emit = defineEmits<{
  "update:page": [value: number];
  "update:perPage": [value: number];
  view: [transaction: PlanTransaction];
  pay: [transaction: PlanTransaction];
}>();

function isPaid(transaction: PlanTransaction): boolean {
  return transaction.payment_status === "paid";
}

function isPendingVerification(transaction: PlanTransaction): boolean {
  return transaction.payment_status === "pending_verification";
}

function isExpired(transaction: PlanTransaction): boolean {
  return transaction.payment_status === "expired";
}

function paymentStatusLabel(transaction: PlanTransaction): string {
  if (isPaid(transaction)) return "Paid";
  if (isPendingVerification(transaction)) return "Pending verification";
  if (transaction.payment_status === "rejected") return "Payment rejected";
  if (isExpired(transaction)) return "Payment expired";
  return "Payment required";
}
</script>

<template>
  <div class="transaction-section">

    <div class="card transaction-card">
      <div class="table-wrap">
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Plan</th>
              <th>Payment</th>
              <th>Status</th>
              <th class="amount-column">Amount</th>
              <th class="action-column">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="transaction in transactions" :key="transaction.id">
              <td>
                <div class="transaction-reference">
                  <div class="reference-icon">
                    <CreditCard :size="17" />
                  </div>

                  <div>
                    <strong>{{ transaction.reference }}</strong>
                    <small>#{{ transaction.id }}</small>
                  </div>
                </div>
              </td>

              <td>
                <div class="plan-cell">
                  <strong class="capitalize">{{ transaction.plan }}</strong>
                  <small>{{ transaction.status }}</small>
                </div>
              </td>

              <td>
                <div class="payment-method-cell">
                  <strong>
                    {{
                      transaction.selected_payment_method?.name ||
                      transaction.payment_method ||
                      "Manual payment"
                    }}
                  </strong>
                  <small v-if="isExpired(transaction)">
                    This payment request has expired
                  </small>
                  <small v-else-if="!isPaid(transaction) && !isPendingVerification(transaction)">
                    Complete payment to activate your plan
                  </small>
                  <small v-else-if="isPendingVerification(transaction)">
                    Your payment is being reviewed
                  </small>
                  <small v-else>Payment completed</small>
                </div>
              </td>

              <td>
                <div class="payment-status-cell">
                  <StatusBadge :status="paymentStatusLabel(transaction)" />

                  <span
                    v-if="isPendingVerification(transaction)"
                    class="status-helper"
                  >
                    <Clock3 :size="12" />
                    Awaiting review
                  </span>

                  <span v-else-if="isPaid(transaction)" class="status-helper paid">
                    <CheckCircle2 :size="12" />
                    Confirmed
                  </span>
                </div>
              </td>

              <td class="amount-column">
                <strong class="transaction-amount">
                  {{ formatPlanCurrency(transaction.amount) }}
                </strong>
              </td>

              <td class="action-column">
                <div class="row-actions modern-actions">
                  <button
                    v-if="!isPaid(transaction) && !isPendingVerification(transaction) && !isExpired(transaction)"
                    type="button"
                    class="btn btn-primary btn-small pay-button"
                    @click.stop="emit('pay', transaction)"
                  >
                    Pay now
                    <ArrowRight :size="14" />
                  </button>

                  <button
                    v-else-if="isPendingVerification(transaction)"
                    type="button"
                    class="btn btn-small review-button"
                    @click.stop="emit('pay', transaction)"
                  >
                    Review payment
                  </button>

                  <button
                    type="button"
                    class="btn btn-small icon-label-button"
                    @click.stop="emit('view', transaction)"
                  >
                    <Eye :size="14" />
                    View
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
  </div>
</template>
