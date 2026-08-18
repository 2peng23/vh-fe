<script setup lang="ts">
import { X } from "lucide-vue-next";
import StatusBadge from "../../../components/StatusBadge.vue";
import { formatDate, formatDateTime } from "../../../utils";
import type { PlanTransaction } from "../types";
import { formatPlanCurrency } from "../utils";

defineProps<{
  transaction: PlanTransaction;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal transaction-detail-modal">
      <div class="modal-head">
        <div>
          <h2>Transaction details</h2>
          <p>{{ transaction.reference }}</p>
        </div>

        <button type="button" class="icon-btn" @click="$emit('close')">
          <X />
        </button>
      </div>

      <dl class="detail-list">
        <div>
          <dt>Payment status</dt>
          <dd>
            <StatusBadge
              :status="transaction.payment_status === 'paid' ? 'Paid' : 'Not paid'"
            />
          </dd>
        </div>

        <div>
          <dt>Transaction status</dt>
          <dd><StatusBadge :status="transaction.status" /></dd>
        </div>

        <div>
          <dt>Plan</dt>
          <dd class="capitalize">{{ transaction.plan }}</dd>
        </div>

        <div>
          <dt>Amount</dt>
          <dd>{{ formatPlanCurrency(transaction.amount) }}</dd>
        </div>

        <div>
          <dt>Payment method</dt>
          <dd>
            {{
              transaction.selected_payment_method?.name ||
              transaction.payment_method
            }}
          </dd>
        </div>

        <div>
          <dt>Account name</dt>
          <dd>{{ transaction.selected_payment_method?.account_name || "—" }}</dd>
        </div>

        <div>
          <dt>Account number</dt>
          <dd>
            {{ transaction.selected_payment_method?.account_number || "—" }}
          </dd>
        </div>

        <div>
          <dt>Payment date</dt>
          <dd>{{ formatDate(transaction.paid_at) }}</dd>
        </div>

        <div>
          <dt>Plan starts</dt>
          <dd>{{ formatDate(transaction.starts_at) }}</dd>
        </div>

        <div>
          <dt>Plan ends</dt>
          <dd>{{ formatDate(transaction.ends_at) }}</dd>
        </div>

        <div>
          <dt>Created</dt>
          <dd>{{ formatDateTime(transaction.created_at) }}</dd>
        </div>

        <div class="full">
          <dt>Notes</dt>
          <dd>{{ transaction.notes || "—" }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
