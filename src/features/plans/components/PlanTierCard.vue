<script setup lang="ts">
import { BadgePercent, Check, Sparkles } from "lucide-vue-next";
import type { EnrichedPlanGroup } from "../types";
import { isPopularPlan, planClass } from "../utils";
import PlanBillingOption from "./PlanBillingOption.vue";

defineProps<{
  group: EnrichedPlanGroup;
  benefits: readonly string[];
  selectedOfferingId: string;
}>();

const emit = defineEmits<{
  "update:selectedOfferingId": [value: string];
}>();
</script>

<template>
  <article
    class="plan-tier-card"
    :class="[
      planClass(group.name),
      { 'plan-tier-card-popular': isPopularPlan(group.name) },
    ]"
  >
    <div v-if="isPopularPlan(group.name)" class="popular-ribbon">
      <Sparkles :size="13" />
      Most Popular
    </div>

    <header class="plan-card-header">
      <div class="plan-name-area">
        <span class="plan-tier-label">PLAN</span>
        <h3>{{ group.name }}</h3>
        <p>{{ group.details }}</p>
      </div>

      <div class="vehicle-limit-badge">
        <strong>{{ group.vehicleLimit }}</strong>
        <span>vehicles</span>
      </div>
    </header>

    <div class="plan-features-wrapper">
      <span class="plan-section-label">EVERYTHING INCLUDED</span>

      <ul class="plan-benefits">
        <li v-for="benefit in benefits" :key="benefit">
          <span class="benefit-check"><Check :size="13" /></span>
          <span>{{ benefit }}</span>
        </li>
      </ul>
    </div>

    <div class="billing-section">
      <div class="billing-section-heading">
        <div>
          <strong>Choose billing period</strong>
          <small>Longer plans save more</small>
        </div>
        <BadgePercent :size="18" />
      </div>

      <div class="plan-period-options">
        <PlanBillingOption
          v-for="offering in group.offerings"
          :key="offering.id"
          :offering="offering"
          :selected="String(offering.id) === selectedOfferingId"
          @select="emit('update:selectedOfferingId', $event)"
        />
      </div>
    </div>
  </article>
</template>

<style scoped>
.plan-tier-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.03),
    0 12px 30px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.plan-tier-card:hover {
  transform: translateY(-4px);
  border-color: #cbd5e1;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.07),
    0 22px 45px rgba(15, 23, 42, 0.08);
}

.plan-tier-card-popular {
  border: 2px solid #0d9488;
  box-shadow:
    0 8px 25px rgba(13, 148, 136, 0.13),
    0 24px 50px rgba(13, 148, 136, 0.08);
}

.plan-tier-card-popular:hover {
  border-color: #0f766e;
  box-shadow:
    0 10px 30px rgba(13, 148, 136, 0.18),
    0 30px 60px rgba(13, 148, 136, 0.1);
}

.popular-ribbon {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 15px;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  border-radius: 0 0 12px 12px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.plan-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 22px 22px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border-bottom: 1px solid #edf2f7;
}

.plan-tier-card-popular .plan-card-header {
  padding-top: 42px;
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
}

.plan-name-area {
  min-width: 0;
}

.plan-tier-label,
.plan-section-label {
  display: block;
  margin-bottom: 6px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.plan-name-area h3 {
  margin: 0;
  color: #0f172a;
  font-size: 23px;
  font-weight: 800;
}

.plan-name-area p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
}

.vehicle-limit-badge {
  min-width: 72px;
  padding: 10px;
  text-align: center;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 12px;
}

.vehicle-limit-badge strong {
  display: block;
  color: #0f766e;
  font-size: 20px;
  line-height: 1;
}

.vehicle-limit-badge span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 9px;
  font-weight: 600;
}

.plan-features-wrapper {
  flex: 1;
  padding: 22px;
}

.plan-benefits {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: #475569;
  font-size: 11px;
  line-height: 1.45;
}

.benefit-check {
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  color: #047857;
  background: #d1fae5;
  border-radius: 50%;
}

.billing-section {
  padding: 20px 22px 22px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.billing-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
  color: #0f766e;
}

.billing-section-heading > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.billing-section-heading strong {
  color: #0f172a;
  font-size: 12px;
}

.billing-section-heading small {
  color: #64748b;
  font-size: 9px;
}

.plan-period-options {
  display: grid;
  gap: 12px;
}

@media (max-width: 760px) {
  .plan-card-header {
    flex-direction: column;
  }

  .vehicle-limit-badge {
    width: fit-content;
  }
}
</style>
