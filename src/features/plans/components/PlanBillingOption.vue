<script setup lang="ts">
import { BadgePercent, CheckCircle2, Sparkles } from "lucide-vue-next";
import type { EnrichedPlanOffering } from "../types";
import {
  billingPeriodLabel,
  billingPeriodShortLabel,
  formatPlanCurrency,
} from "../utils";

defineProps<{
  offering: EnrichedPlanOffering;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>

<template>
  <label
    class="plan-period-option"
    :class="{ selected, 'best-value': offering.best_value }"
  >
    <input
      type="radio"
      :value="String(offering.id)"
      :checked="selected"
      @change="emit('select', String(offering.id))"
    />

    <div v-if="offering.best_value" class="best-value-label">
      <Sparkles :size="10" />
      BEST VALUE
    </div>

    <div class="billing-option-top">
      <div class="billing-period-name">
        <span class="custom-radio" :class="{ checked: selected }">
          <CheckCircle2 v-if="selected" :size="18" />
        </span>

        <strong>
          {{ billingPeriodLabel(Number(offering.duration_months)) }}
        </strong>
      </div>

      <span v-if="offering.discount_percent > 0" class="discount-badge">
        <BadgePercent :size="13" />
        SAVE {{ offering.discount_percent }}%
      </span>
    </div>

    <div class="billing-price">
      <div v-if="offering.discount_percent > 0" class="regular-price">
        <span>{{ formatPlanCurrency(offering.regular_price) }}</span>
      </div>

      <div class="current-price">
        <strong>{{ formatPlanCurrency(offering.price) }}</strong>
        <span>
          {{ billingPeriodShortLabel(Number(offering.duration_months)) }}
        </span>
      </div>

      <div
        v-if="Number(offering.duration_months) > 1"
        class="monthly-equivalent"
      >
        Only
        <strong>{{ formatPlanCurrency(offering.monthly_equivalent) }}</strong>
        / month
      </div>
    </div>

    <div v-if="offering.discount_percent > 0" class="savings-message">
      <span>Your total savings</span>
      <strong>{{ formatPlanCurrency(offering.savings) }}</strong>
    </div>
  </label>
</template>

