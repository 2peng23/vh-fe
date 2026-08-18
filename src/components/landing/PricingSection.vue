<script setup lang="ts">
import { computed } from "vue";
import type { PublicPlanOffering } from "../../types";
import PricingCard from "./PricingCard.vue";

const FEATURED_PLAN = "business";
const planOrder: Record<string, number> = {
  trial: 0,
  starter: 1,
  business: 2,
  enterprise: 3,
};

const props = defineProps<{
  plans: PublicPlanOffering[];
  loading: boolean;
  error: string;
}>();

const displayPlans = computed(() =>
  [...props.plans].sort((a, b) => {
    const planSort = (planOrder[a.plan] ?? 99) - (planOrder[b.plan] ?? 99);
    return planSort || a.duration_months - b.duration_months;
  }),
);
</script>

<template>
  <section id="pricing" class="bg-slate-50 py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Plans</p>
        <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">Choose the Right Plan for Your Fleet</h2>
        <p class="mt-4 text-base leading-7 text-slate-600">
          Start with the free trial, then upgrade when your operation needs more capacity.
        </p>
      </div>

      <div v-if="loading" class="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 4" :key="item" class="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="h-5 w-32 rounded bg-gray-100"></div>
          <div class="mt-6 h-10 w-28 rounded bg-gray-100"></div>
          <div class="mt-4 h-4 w-20 rounded bg-gray-100"></div>
          <div class="mt-6 h-16 rounded bg-gray-100"></div>
          <div class="mt-6 h-11 rounded bg-gray-100"></div>
        </div>
      </div>

      <div v-else-if="error" class="mx-auto mt-10 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-800">
        {{ error }}
      </div>

      <div v-else class="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PricingCard
          v-for="plan in displayPlans"
          :key="`${plan.plan}-${plan.id}-${plan.duration_months}`"
          :featured="plan.plan === FEATURED_PLAN"
          :plan="plan"
        />
      </div>
    </div>
  </section>
</template>
