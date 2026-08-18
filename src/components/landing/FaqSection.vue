<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown } from "lucide-vue-next";
import type { PublicPlanOffering } from "../../types";

const props = defineProps<{ plans: PublicPlanOffering[] }>();
const openIndex = ref(0);

const trial = computed(() => props.plans.find((plan) => plan.plan === "trial"));
const trialDuration = computed(() => {
  if (!trial.value) return "your free trial period";
  if (trial.value.duration_days) return `${trial.value.duration_days} days`;
  return `${trial.value.duration_months} month${trial.value.duration_months === 1 ? "" : "s"}`;
});
const trialLimit = computed(() =>
  trial.value ? `up to ${trial.value.vehicle_limit.toLocaleString()} vehicles` : "the trial vehicle limit configured for your account",
);
const questions = computed(() => [
  { question: "What is Vehicle Hub?", answer: "Vehicle Hub is a SaaS platform for managing vehicle records, maintenance, mileage, expenses, documents, drivers, issues, schedules, reports, staff, notifications, and support in one workspace." },
  { question: "How does the free trial work?", answer: `Create a business account and use Vehicle Hub during ${trialDuration.value}. You can review paid plans when your team is ready to upgrade.` },
  { question: "How many vehicles can I manage during the trial?", answer: `The current trial supports ${trialLimit.value}.` },
  { question: "Do I need a credit card to register?", answer: "No credit card is required to create a Vehicle Hub trial account." },
  { question: "Can I upgrade my subscription later?", answer: "Yes. Owners can view plan options and request an upgrade from the subscription area after signing in." },
  { question: "Can I downgrade my plan?", answer: "Yes. Owners can request a downgrade, and the application handles the subscription change through the existing plan flow." },
  { question: "What happens when my trial expires?", answer: "Your account is guided to the subscription area so the owner can review available plans and continue service." },
  { question: "Can I add staff members?", answer: "Yes. Vehicle Hub includes staff management and permissions for supported roles." },
  { question: "Can I track maintenance and expenses?", answer: "Yes. Maintenance records, issue tracking, mileage, fuel, and expenses are part of the fleet workspace." },
  { question: "Can I manage vehicle documents?", answer: "Yes. Vehicle Hub keeps important vehicle documents organized with the related vehicle records." },
]);
</script>

<template>
  <section id="faq" class="bg-white py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">FAQ</p>
        <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">Questions Before You Start</h2>
      </div>
      <div class="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div v-for="(item, index) in questions" :key="item.question">
          <button
            class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600"
            type="button"
            :aria-expanded="openIndex === index"
            @click="openIndex = openIndex === index ? -1 : index"
          >
            <span class="font-['Manrope'] text-base font-extrabold text-slate-950">{{ item.question }}</span>
            <ChevronDown class="h-5 w-5 flex-none text-slate-500 transition-transform" :class="{ 'rotate-180': openIndex === index }" />
          </button>
          <div v-if="openIndex === index" class="px-5 pb-5 text-sm leading-7 text-slate-600">
            {{ item.answer }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
