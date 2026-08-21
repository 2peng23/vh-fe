<script setup lang="ts">
import { Check } from "lucide-vue-next";
import type {
  EnrichedPlanGroup,
  PaymentMethod,
  SelectedOffering,
  SubscriptionPreview,
} from "../types";
import { appName } from "../../../config/app";

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

  preview: SubscriptionPreview | null;
  loadingPreview: boolean;

  currentSubscription?: {
    tier: string;
    label: string;
    vehicle_limit: number;
    vehicle_count: number;
    remaining_days: number;
    plan_ends_at: string | null;
  };
}>();

const emit = defineEmits<{
  "update:selectedOfferingId": [value: string];
  "update:paymentMethodId": [value: string];
  purchase: [];
}>();
</script>

<template>
  <section class="plan-purchase-page landing-pricing-section">
    <!-- Pricing Hero -->
    <div class="pricing-hero-wrapper">
      <PlanPricingHero />
    </div>

    <section class="landing-included-panel plan-purchase-included-panel">
      <div>
        <span class="plan-section-label">EVERYTHING INCLUDED</span>
        <h3>All plans include the full {{ appName }} toolkit</h3>
      </div>

      <ul>
        <li v-for="benefit in benefits" :key="benefit">
          <span class="benefit-check"><Check :size="13" /></span>
          <span>{{ benefit }}</span>
        </li>
      </ul>
    </section>

    <!-- Pricing Plans -->
    <div class="landing-plan-tier-grid plan-tier-grid">
      <PlanTierCard
        v-for="group in planGroups"
        :key="group.name"
        class="plan-tier-card"
        :group="group"
        :benefits="benefits"
        :selected-offering-id="selectedOfferingId"
        compact
        @update:selected-offering-id="emit('update:selectedOfferingId', $event)"
      />
    </div>

    <!-- Checkout -->
    <div class="checkout-wrapper">
      <PlanCheckout
        :selected-offering="selectedOffering"
        :payment-methods="paymentMethods"
        :selected-payment-method="selectedPaymentMethod"
        :payment-method-id="paymentMethodId"
        :purchasing="purchasing"
        :preview="preview"
        :loading-preview="loadingPreview"
        @update:payment-method-id="emit('update:paymentMethodId', $event)"
        @submit="emit('purchase')"
      />
    </div>
  </section>
</template>

<style scoped>
/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
|
| Container queries are used instead of viewport breakpoints because this
| page sits beside the application sidebar.
|
| This means the cards respond to the ACTUAL available content width.
|
*/

.plan-purchase-page {
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

/*
|--------------------------------------------------------------------------
| Pricing Hero
|--------------------------------------------------------------------------
*/

.pricing-hero-wrapper {
  width: 100%;
  min-width: 0;
  margin-bottom: 28px;
}

.plan-purchase-included-panel {
  margin-bottom: 24px;
}

/*
|--------------------------------------------------------------------------
| Plan Grid
|--------------------------------------------------------------------------
|
| Default:
| Mobile / narrow page -> 1 column
|
*/

.plan-tier-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}

/*
|--------------------------------------------------------------------------
| Individual Plan
|--------------------------------------------------------------------------
|
| Important:
| Do NOT apply min-width: 0 to every nested element.
| That was causing the billing rows to collapse too aggressively.
|
*/

.plan-tier-card {
  width: 100%;
  min-width: 0;
  height: 100%;
}

/*
|--------------------------------------------------------------------------
| Medium Content Width
|--------------------------------------------------------------------------
|
| Once the content area has enough room, use two cards.
|
| Each card gets roughly 500px+ depending on available space.
|
*/

@container (min-width: 940px) {
  .plan-tier-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/*
|--------------------------------------------------------------------------
| Very Wide Content Width
|--------------------------------------------------------------------------
|
| Only show all three cards in one row when there is genuinely enough room.
|
| This prevents:
|
| ₱31,999.00
| / 6
| months
|
| and other ugly wrapping.
|
*/

@container (min-width: 1450px) {
  .plan-tier-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
*/

.checkout-wrapper {
  width: 100%;
  min-width: 0;
  margin-top: 32px;
}

/*
|--------------------------------------------------------------------------
| Mobile
|--------------------------------------------------------------------------
*/

@media (max-width: 640px) {
  .pricing-hero-wrapper {
    margin-bottom: 20px;
  }

  .plan-tier-grid {
    gap: 18px;
  }

  .checkout-wrapper {
    margin-top: 24px;
  }
}
</style>
