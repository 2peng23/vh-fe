<script setup lang="ts">
import type {
  EnrichedPlanGroup,
  PaymentMethod,
  SelectedOffering,
} from "../types";
import PlanCheckout from "./PlanCheckout.vue";
import PlanPricingHero from "./PlanPricingHero.vue";
import PlanTierCard from "./PlanTierCard.vue";

defineProps<{
  planGroups: EnrichedPlanGroup[];
  benefits: readonly string[];
  selectedOfferingId: string;
  selectedOffering: SelectedOffering | null;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod?: PaymentMethod;
  paymentMethodId: string;
  purchasing: boolean;
}>();

const emit = defineEmits<{
  "update:selectedOfferingId": [value: string];
  "update:paymentMethodId": [value: string];
  purchase: [];
}>();
</script>

<template>
  <section class="plan-purchase-page">
    <PlanPricingHero />

    <div class="plan-tier-grid">
      <PlanTierCard
        v-for="group in planGroups"
        :key="group.name"
        :group="group"
        :benefits="benefits"
        :selected-offering-id="selectedOfferingId"
        @update:selected-offering-id="
          emit('update:selectedOfferingId', $event)
        "
      />
    </div>

    <PlanCheckout
      :selected-offering="selectedOffering"
      :payment-methods="paymentMethods"
      :selected-payment-method="selectedPaymentMethod"
      :payment-method-id="paymentMethodId"
      :purchasing="purchasing"
      @update:payment-method-id="emit('update:paymentMethodId', $event)"
      @submit="emit('purchase')"
    />
  </section>
</template>

<style scoped>
.plan-tier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  align-items: stretch;
}

@media (max-width: 1180px) {
  .plan-tier-grid {
    grid-template-columns: 1fr;
  }
}
</style>
