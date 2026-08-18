<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { MessageCircle } from "lucide-vue-next";

import {
  BenefitsSection,
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  LandingFooter,
  LandingNavbar,
  PricingSection,
  TargetCustomersSection,
} from "../components/landing";

import SupportChatView from "./SupportChatView.vue";

import { getPublicPlanOfferings } from "../services";
import type { PublicPlanOffering } from "../types";

const plans = ref<PublicPlanOffering[]>([]);
const loadingPlans = ref(true);
const pricingError = ref("");

const supportOpen = ref(false);

const trialPlan = computed(() =>
  plans.value.find((plan) => plan.plan === "trial"),
);

const trialLabel = computed(() => {
  if (!trialPlan.value) {
    return "Free trial available";
  }

  if (trialPlan.value.duration_days) {
    return `${trialPlan.value.duration_days}-day free trial`;
  }

  if (trialPlan.value.duration_months === 1) {
    return "1-month free trial";
  }

  return `${trialPlan.value.duration_months}-month free trial`;
});

function openSupport() {
  supportOpen.value = true;
}

function closeSupport() {
  supportOpen.value = false;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && supportOpen.value) {
    closeSupport();
  }
}

watch(supportOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onMounted(async () => {
  document.title = "Vehicle Hub | Vehicle & Fleet Management";

  const description =
    "Manage vehicles, maintenance, mileage, expenses, documents, drivers, issues, and fleet operations from one centralized platform.";

  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }

  meta.content = description;

  window.addEventListener("keydown", handleEscape);

  try {
    plans.value = await getPublicPlanOfferings();
  } catch {
    pricingError.value =
      "We couldn't load our plans right now. Please try again shortly.";
  } finally {
    loadingPlans.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleEscape);
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900 antialiased">
    <LandingNavbar />

    <main>
      <HeroSection :trial-label="trialLabel" />

      <FeaturesSection />

      <HowItWorksSection />

      <PricingSection
        :error="pricingError"
        :loading="loadingPlans"
        :plans="plans"
      />

      <BenefitsSection />

      <TargetCustomersSection />

      <FaqSection :plans="plans" />

      <FinalCtaSection />
    </main>

    <LandingFooter @open-support="openSupport" />

    <!-- Floating Support Button -->
    <button
      v-if="!supportOpen"
      type="button"
      class="cursor-pointer group fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2.5 rounded-full bg-teal-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_35px_rgba(15,118,110,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-[0_14px_40px_rgba(15,118,110,0.35)] focus:outline-none focus:ring-4 focus:ring-teal-100 sm:bottom-6 sm:right-6 sm:px-5"
      aria-label="Contact Vehicle Hub support"
      @click="openSupport"
    >
      <span
        class="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition group-hover:bg-white/20"
      >
        <MessageCircle class="h-[18px] w-[18px]" />
      </span>

      <span class="hidden sm:inline"> Contact support </span>
    </button>

    <!-- Support Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="supportOpen"
          class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
          @click.self="closeSupport"
        >
          <div class="relative max-h-[calc(100vh-32px)] w-full max-w-[900px]">
            <SupportChatView embedded guest @close="closeSupport" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
