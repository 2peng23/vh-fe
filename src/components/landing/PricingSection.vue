<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { BadgePercent, Check, Sparkles } from "lucide-vue-next";
import type { PublicPlanOffering } from "../../types";
import type {
  EnrichedPlanGroup,
  EnrichedPlanOffering,
  PlanOffering,
} from "../../features/plans/types";
import { appName } from "../../config/app";
import { PLAN_BENEFITS } from "../../features/plans/constants";
import PlanBillingOption from "../../features/plans/components/PlanBillingOption.vue";
import {
  buildPlanGroups,
  formatPlanCurrency,
  isPopularPlan,
  planClass,
} from "../../features/plans/utils";

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

const selectedOfferingIds = ref<Record<string, string>>({});
const sortedPlans = computed(() =>
  [...props.plans].sort((a, b) => {
    const planSort = (planOrder[a.plan] ?? 99) - (planOrder[b.plan] ?? 99);
    return planSort || a.duration_months - b.duration_months;
  }),
);
const trialPlan = computed(() =>
  sortedPlans.value.find((plan) => plan.plan === "trial"),
);
const paidPlanGroups = computed<EnrichedPlanGroup[]>(() =>
  buildPlanGroups(
    sortedPlans.value
      .filter((plan) => plan.plan !== "trial")
      .map(
        (plan): PlanOffering => ({
          ...plan,
          details: plan.details || "",
        }),
      ),
  ).sort(
    (a, b) =>
      (planOrder[a.offerings[0]?.plan] ?? 99) -
      (planOrder[b.offerings[0]?.plan] ?? 99),
  ),
);

watch(
  paidPlanGroups,
  (groups) => {
    const next = { ...selectedOfferingIds.value };

    for (const group of groups) {
      if (next[group.name]) continue;

      const monthly =
        group.offerings.find(
          (offering) => Number(offering.duration_months) === 1,
        ) ?? group.offerings[0];

      if (monthly) next[group.name] = String(monthly.id);
    }

    selectedOfferingIds.value = next;
  },
  { immediate: true },
);

function selectedOffering(group: EnrichedPlanGroup): EnrichedPlanOffering {
  return (
    group.offerings.find(
      (offering) => String(offering.id) === selectedOfferingIds.value[group.name],
    ) ?? group.offerings[0]
  );
}

function registerRoute(plan: string, offeringId?: string | number) {
  const query = new URLSearchParams({ plan });
  if (offeringId) query.set("offering", String(offeringId));

  return `/register?${query.toString()}`;
}
</script>

<template>
  <section id="pricing" class="landing-pricing-section bg-slate-50 py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Plans</p>
        <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">Choose the Right Plan for Your Vehicle</h2>
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

      <template v-else>
        <article v-if="trialPlan" class="landing-trial-banner mt-12">
          <div>
            <span class="plan-tier-label">FREE TRIAL</span>
            <h3>{{ trialPlan.name }}</h3>
            <p>{{ trialPlan.details || `Explore ${appName} before choosing a paid subscription.` }}</p>
          </div>
          <div class="landing-trial-facts">
            <span><strong>{{ trialPlan.duration_days || 30 }}</strong> days</span>
            <span><strong>{{ trialPlan.vehicle_limit }}</strong> vehicles</span>
            <span><strong>{{ formatPlanCurrency(trialPlan.price) }}</strong> due today</span>
          </div>
          <RouterLink class="landing-trial-cta" to="/register">
            Start Free Trial
          </RouterLink>
        </article>

        <section class="landing-included-panel" :class="{ 'mt-12': !trialPlan, 'mt-6': trialPlan }">
          <div>
            <span class="plan-section-label">EVERYTHING INCLUDED</span>
            <h3>All plans include the full {{ appName }} toolkit</h3>
          </div>
          <ul>
            <li v-for="benefit in PLAN_BENEFITS" :key="benefit">
              <span class="benefit-check"><Check :size="13" /></span>
              <span>{{ benefit }}</span>
            </li>
          </ul>
        </section>

        <div class="landing-plan-tier-grid mt-6">
        <article
          v-for="group in paidPlanGroups"
          :key="group.name"
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
                :selected="String(offering.id) === selectedOfferingIds[group.name]"
                @select="selectedOfferingIds[group.name] = $event"
              />
            </div>

            <RouterLink
              class="landing-plan-cta"
              :to="registerRoute(selectedOffering(group).plan, selectedOfferingIds[group.name])"
            >
              Choose {{ group.name }}
            </RouterLink>
          </div>
        </article>
      </div>
      </template>
    </div>
  </section>
</template>
