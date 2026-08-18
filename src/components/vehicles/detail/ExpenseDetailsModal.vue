<script setup lang="ts">
import { X } from "lucide-vue-next";
import { formatCurrency, formatDate } from "../../../utils";

defineProps<{
  expense: any | null;
}>();

const emit = defineEmits<{
  close: [];
  navigateSource: [expense: any];
}>();
</script>

<template>
  <div v-if="expense" class="modal-backdrop" @click.self="emit('close')">
    <section class="modal small-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h2>Expense details</h2>
          <p>{{ expense.source }}</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Close" @click="emit('close')">
          <X />
        </button>
      </div>

      <dl class="maintenance-detail-list">
        <div><dt>Category</dt><dd>{{ expense.category }}</dd></div>
        <div><dt>Amount</dt><dd>{{ formatCurrency(expense.amount) }}</dd></div>
        <div><dt>Expense date</dt><dd>{{ formatDate(expense.expense_date) }}</dd></div>
        <div><dt>Vendor</dt><dd>{{ expense.vendor || "—" }}</dd></div>
        <div class="full"><dt>Recorded by</dt><dd>{{ expense.recorder?.name || "—" }}</dd></div>
        <div class="full">
          <dt>Source</dt>
          <dd>
            <button
              v-if="expense.maintenance_record_id || expense.fuel_log_id"
              type="button"
              class="source-link"
              @click="emit('navigateSource', expense)"
            >
              {{ expense.source }}
            </button>
            <template v-else>{{ expense.source }}</template>
          </dd>
        </div>
        <div class="full"><dt>Description</dt><dd>{{ expense.description || "—" }}</dd></div>
      </dl>

      <div class="modal-actions">
        <button type="button" class="btn" @click="emit('close')">Close</button>
      </div>
    </section>
  </div>
</template>
