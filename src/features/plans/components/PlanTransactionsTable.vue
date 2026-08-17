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

function paymentStatusLabel(transaction: PlanTransaction): string {
  if (isPaid(transaction)) return "Paid";
  if (isPendingVerification(transaction)) return "Pending verification";
  if (transaction.payment_status === "rejected") return "Payment rejected";
  return "Payment required";
}
</script>

<template>
  <div class="transaction-section">
    <div class="transaction-section-head">
      <div>
        <span class="section-eyebrow">BILLING HISTORY</span>
        <h2>Plan transactions</h2>
        <p>Track purchases, complete pending payments, and review your subscription history.</p>
      </div>
    </div>

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
                  <small v-if="!isPaid(transaction) && !isPendingVerification(transaction)">
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
                    v-if="!isPaid(transaction) && !isPendingVerification(transaction)"
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

.transaction-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.transactions-table {
  min-width: 1040px;
}

.transactions-table th {
  padding-top: 13px;
  padding-bottom: 13px;
  color: #64748b;
  background: #f8fafc;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.transactions-table td {
  padding-top: 15px;
  padding-bottom: 15px;
  vertical-align: middle;
}

.transaction-reference {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reference-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 10px;
}

.transaction-reference strong,
.plan-cell strong,
.payment-method-cell strong {
  display: block;
  color: #1e293b;
  font-size: 12px;
}

.transaction-reference small,
.plan-cell small,
.payment-method-cell small {
  display: block;
  margin-top: 3px;
  color: #94a3b8;
  font-size: 10px;
}

.payment-status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.status-helper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a16207;
  font-size: 9px;
  font-weight: 700;
}

.status-helper.paid {
  color: #15803d;
}

.amount-column {
  text-align: right;
}

.transaction-amount {
  color: #0f172a;
  font-size: 13px;
  white-space: nowrap;
}

.action-column {
  width: 190px;
}

.modern-actions {
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.pay-button,
.icon-label-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.review-button {
  color: #a16207;
  background: #fffbeb;
  border-color: #fde68a;
}

@media (max-width: 760px) {
  .transaction-section-head h2 {
    font-size: 19px;
  }
}
</style>
