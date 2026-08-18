<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { CheckCircle2 } from "lucide-vue-next";
import type { PublicPlanOffering } from "../../types";
import { formatCurrency, formatNumber } from "../../utils";

const props = defineProps<{
  plan: PublicPlanOffering;
  featured: boolean;
}>();

const price = computed(() => formatCurrency(props.plan.price));
const isTrial = computed(() => props.plan.plan === "trial");
const ctaLabel = computed(() =>
  isTrial.value ? "Start Free Trial" : `Choose ${props.plan.name}`,
);
const ctaRoute = computed(() =>
  isTrial.value ? "/register" : `/register?plan=${encodeURIComponent(props.plan.plan)}`,
);
const durationLabel = computed(() => {
  if (isTrial.value && props.plan.duration_days) {
    return `${props.plan.duration_days} days`;
  }

  if (props.plan.duration_months === 1) return "for 1 month";

  return `for ${props.plan.duration_months} months`;
});
</script>

<template>
  <article
    class="relative flex h-full flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md motion-reduce:hover:translate-y-0"
    :class="featured ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'"
  >
    <span v-if="featured" class="absolute right-4 top-4 rounded-full bg-teal-700 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
      Most Popular
    </span>
    <div class="pr-24">
      <h3 class="font-['Manrope'] text-xl font-extrabold text-slate-950">{{ plan.name }}</h3>
      <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{{ plan.plan }}</p>
    </div>
    <div class="mt-6">
      <strong class="font-['Manrope'] text-4xl font-extrabold text-slate-950">{{ price }}</strong>
      <p class="mt-2 text-sm font-semibold text-slate-500">{{ durationLabel }}</p>
    </div>
    <div class="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700">
      <CheckCircle2 class="mt-0.5 h-4 w-4 flex-none text-teal-700" />
      <span>Up to {{ formatNumber(plan.vehicle_limit) }} vehicles</span>
    </div>
    <p class="mt-5 min-h-20 text-sm leading-6 text-slate-600">{{ plan.details || "Flexible fleet management for your vehicle operations." }}</p>
    <RouterLink
      class="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
      :class="featured ? 'bg-teal-700 text-white hover:bg-teal-800' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'"
      :to="ctaRoute"
    >
      {{ ctaLabel }}
    </RouterLink>
  </article>
</template>
