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

