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

<style scoped>
.plan-period-option {
  position: relative;
  display: block;
  padding: 15px;
  cursor: pointer;
  background: #ffffff;
  border: 1.5px solid #dbe3ed;
  border-radius: 13px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.plan-period-option:hover {
  transform: translateY(-1px);
  border-color: #94a3b8;
}

.plan-period-option.selected {
  background: #f0fdfa;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.plan-period-option.best-value {
  margin-top: 6px;
}

.plan-period-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.best-value-label {
  position: absolute;
  top: -10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  color: #ffffff;
  background: linear-gradient(135deg, #047857, #10b981);
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.07em;
}

.billing-option-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.billing-period-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.billing-period-name strong {
  color: #1e293b;
  font-size: 12px;
}

.custom-radio {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.custom-radio.checked {
  background: #0d9488;
  border-color: #0d9488;
}

.discount-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  color: #15803d;
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
  white-space: nowrap;
}

.billing-price {
  margin-top: 13px;
}

.regular-price span {
  color: #94a3b8;
  font-size: 10px;
  text-decoration: line-through;
}

.current-price {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.current-price strong {
  color: #0f172a;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.2;
}

.current-price span {
  color: #64748b;
  font-size: 9px;
}

.monthly-equivalent {
  margin-top: 5px;
  color: #64748b;
  font-size: 9px;
}

.monthly-equivalent strong {
  color: #0f766e;
  font-weight: 800;
}

.savings-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding-top: 9px;
  color: #64748b;
  border-top: 1px dashed #dbe3ed;
  font-size: 9px;
}

.savings-message strong {
  color: #15803d;
  font-size: 10px;
}

@media (max-width: 640px) {
  .billing-option-top {
    align-items: flex-start;
  }
}
</style>
