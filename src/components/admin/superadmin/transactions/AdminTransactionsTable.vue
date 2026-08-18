<script setup lang="ts">
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  ShieldCheck,
} from "lucide-vue-next";
import PaginationControls from "../../../PaginationControls.vue";
import StatusBadge from "../../../StatusBadge.vue";
import type { PaginationMeta } from "../../../../types";
import type { ReviewableAdminTransaction } from "./types";
import {
  formatAdminTransactionCurrency,
  isPaymentPaid,
  isPaymentPending,
  paymentStatusLabel,
} from "./utils";

const props = defineProps<{
  transactions: ReviewableAdminTransaction[];
  meta?: PaginationMeta;
  page: number;
  perPage: number;
}>();

const emit = defineEmits<{
  "update:page": [value: number];
  "update:perPage": [value: number];
  review: [transaction: ReviewableAdminTransaction];
  view: [transaction: ReviewableAdminTransaction];
  "open-business": [transaction: ReviewableAdminTransaction];
}>();

function needsReview(transaction: ReviewableAdminTransaction): boolean {
  return isPaymentPending(transaction);
}
</script>

<template>
  <div class="admin-transaction-card card">
    <div class="table-wrap">
      <table class="admin-transactions-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Transaction</th>
            <th>Plan</th>
            <th>Payment</th>
            <th>Status</th>
            <th class="amount-column">Amount</th>
            <th class="action-column">Action</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="transaction in props.transactions"
            :key="transaction.id"
            :class="{ 'needs-review-row': needsReview(transaction) }"
          >
            <td>
              <button
                type="button"
                class="business-cell"
                @click="emit('open-business', transaction)"
              >
                <span class="business-icon">
                  <Building2 :size="17" />
                </span>

                <span class="business-copy">
                  <strong>{{ transaction.business?.name || "Unknown business" }}</strong>
                  <small>{{ transaction.business?.email || "—" }}</small>
                </span>
              </button>
            </td>

            <td>
              <div class="transaction-reference">
                <div class="reference-icon">
                  <CreditCard :size="17" />
                </div>

                <div>
                  <strong>{{ transaction.reference || "—" }}</strong>
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

                <small v-if="isPaymentPending(transaction)">
                  Payment proof submitted for review
                </small>
                <small v-else-if="isPaymentPaid(transaction)">
                  Payment verified and completed
                </small>
                <small v-else-if="transaction.payment_status === 'rejected'">
                  Owner can submit a new confirmation
                </small>
                <small v-else>
                  Waiting for the owner to submit payment
                </small>
              </div>
            </td>

            <td>
              <div class="payment-status-cell">
                <StatusBadge :status="paymentStatusLabel(transaction)" />

                <span
                  v-if="isPaymentPending(transaction)"
                  class="status-helper pending"
                >
                  <Clock3 :size="12" />
                  Needs review
                </span>

                <span
                  v-else-if="isPaymentPaid(transaction)"
                  class="status-helper paid"
                >
                  <CheckCircle2 :size="12" />
                  Verified
                </span>
              </div>
            </td>

            <td class="amount-column">
              <strong class="transaction-amount">
                {{ formatAdminTransactionCurrency(transaction.amount) }}
              </strong>
            </td>

            <td class="action-column">
              <div class="row-actions modern-actions">
                <button
                  v-if="isPaymentPending(transaction)"
                  type="button"
                  class="btn btn-primary btn-small review-payment-button"
                  @click.stop="emit('review', transaction)"
                >
                  <ShieldCheck :size="14" />
                  Review payment
                  <ArrowRight :size="14" />
                </button>

                <button
                  v-else
                  type="button"
                  class="btn btn-small"
                  @click.stop="emit('review', transaction)"
                >
                  <Eye :size="14" />
                  Review
                </button>

                <button
                  type="button"
                  class="btn btn-small icon-label-button"
                  @click.stop="emit('view', transaction)"
                >
                  <Eye :size="14" />
                  Details
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationControls
      v-if="props.meta"
      :meta="props.meta"
      :page="props.page"
      :per-page="props.perPage"
      @update:page="emit('update:page', $event)"
      @update:per-page="emit('update:perPage', $event)"
    />
  </div>
</template>

