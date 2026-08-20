<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { Check, Eye, EyeOff } from "lucide-vue-next";
import AppLogo from "../../components/AppLogo.vue";
import { useAuthStore } from "../../stores/auth";
import api, { errorMessage, validationErrors } from "../../api/client";
import type { ApiEnvelope } from "../../types";
import type {
  PaymentMethod,
  PlanTransaction,
} from "../../features/plans/types";

function toQueryString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function planLabel(plan: string) {
  return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free Trial";
}

function displayError(error: unknown) {
  const message = errorMessage(error);
  return message === "Something went wrong. Please try again." &&
    error instanceof Error
    ? error.message
    : message;
}

const fieldLabels: Record<string, string> = {
  business_name: "Business name",
  owner_name: "Your name",
  email: "Email",
  phone: "Phone",
  industry: "Industry",
  password: "Password",
  password_confirmation: "Confirm password",
};

function firstValidationError(errorBag: Record<string, string[]>) {
  const [field, messages] =
    Object.entries(errorBag).find(([, messages]) => messages.length > 0) || [];

  if (!field || !messages?.[0]) return "";

  return `${fieldLabels[field] || field}: ${messages[0]}`;
}

const form = reactive({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    industry: "",
    password: "",
    password_confirmation: "",
  }),
  error = ref(""),
  errors = ref<Record<string, string[]>>({}),
  submitting = ref(false),
  showPassword = ref(false),
  showPasswordConfirmation = ref(false),
  auth = useAuthStore(),
  route = useRoute(),
  router = useRouter();

const selectedPlan = computed(() => toQueryString(route.query.plan)),
  selectedOfferingId = computed(() => toQueryString(route.query.offering)),
  hasPaidPlanSelection = computed(
    () =>
      !!selectedPlan.value &&
      selectedPlan.value !== "trial" &&
      !!selectedOfferingId.value,
  ),
  selectedPlanName = computed(() => planLabel(selectedPlan.value)),
  eyebrow = computed(() =>
    hasPaidPlanSelection.value
      ? `START YOUR ${selectedPlanName.value.toUpperCase()} PLAN`
      : "START YOUR FREE TRIAL",
  ),
  helperCopy = computed(() =>
    hasPaidPlanSelection.value
      ? "Create your workspace, then complete the secure manual payment for your selected plan."
      : "Set up your company workspace in less than two minutes. No credit card required.",
  ),
  buttonLabel = computed(() => {
    if (submitting.value || auth.loading) return "Creating workspace...";
    return hasPaidPlanSelection.value
      ? `Create workspace and pay ${selectedPlanName.value}`
      : "Create free workspace";
  }),
  checklistItems = computed(() =>
    hasPaidPlanSelection.value
      ? [
          `Start on the ${selectedPlanName.value} plan`,
          "Open payment instructions immediately",
          "Activate after payment verification",
        ]
      : [
          "Track vehicles and mileage",
          "Automate maintenance reminders",
          "Monitor documents and expenses",
        ],
  );

async function createSelectedPlanTransaction() {
  const { data: methods } =
    await api.get<ApiEnvelope<PaymentMethod[]>>("/payment-methods");
  const paymentMethod = methods.data[0];
  if (!paymentMethod) {
    throw new Error(
      "No payment method is configured yet. Please contact support before purchasing a paid plan.",
    );
  }

  const { data } = await api.post<ApiEnvelope<PlanTransaction>>(
    "/plan-transactions",
    {
      subscription_plan_offering_id: selectedOfferingId.value,
      payment_method_id: String(paymentMethod.id),
    },
  );

  return data.data;
}

async function submit() {
  error.value = "";
  errors.value = {};
  submitting.value = true;
  try {
    await auth.register(form);
    if (hasPaidPlanSelection.value) {
      const transaction = await createSelectedPlanTransaction();
      router.push({
        path: "/plan-transactions",
        query: { pay: String(transaction.id) },
      });
      return;
    }
    router.push("/dashboard");
  } catch (e) {
    const fieldErrors = validationErrors(e);
    errors.value = fieldErrors;
    error.value = firstValidationError(fieldErrors) ? "" : displayError(e);
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <div
    class="min-h-screen bg-slate-100 px-4 py-6 sm:px-8 [&_.brand_strong]:text-slate-950"
  >
    <div class="mx-auto max-w-6xl">
      <AppLogo />
      <div
        class="mt-11 grid grid-cols-1 items-center gap-5 lg:mt-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
      >
        <section>
          <span
            class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700"
            >{{ eyebrow }}</span
          >
          <h1
            class="my-2 text-3xl font-extrabold leading-tight text-slate-950 lg:text-[34px]"
          >
            Your vehicle, under control.
          </h1>
          <p class="hidden text-sm leading-6 text-slate-500 md:block">
            {{ helperCopy }}
          </p>
          <ul class="mt-7 hidden list-none p-0 md:block">
            <li
              v-for="item in checklistItems"
              :key="item"
              class="my-3.5 flex gap-2.5 text-[13px] text-slate-700"
            >
              <Check class="h-[18px] w-[18px] text-teal-700" />{{ item }}
            </li>
          </ul>
        </section>
        <form
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          @submit.prevent="submit"
        >
          <h2 class="text-xl font-extrabold text-slate-900">
            Create your workspace
          </h2>
          <div class="grid gap-4 py-3 pb-6 md:grid-cols-2">
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Business name
              <input v-model="form.business_name" required />
              <small v-if="errors.business_name" class="text-red-600">{{
                errors.business_name[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Your name
              <input v-model="form.owner_name" required />
              <small v-if="errors.owner_name" class="text-red-600">{{
                errors.owner_name[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Email
              <input v-model="form.email" type="email" required />
              <small v-if="errors.email" class="text-red-600">{{
                errors.email[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Phone
              <input v-model="form.phone" />
              <small v-if="errors.phone" class="text-red-600">{{
                errors.phone[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Industry
              <select v-model="form.industry">
                <option value="">Select industry</option>
                <option>Logistics</option>
                <option>Construction</option>
                <option>Delivery</option>
                <option>Rental</option>
                <option>Other</option>
              </select>
              <small v-if="errors.industry" class="text-red-600">{{
                errors.industry[0]
              }}</small>
            </label>
            <span class="hidden md:block"></span>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Password
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full pr-11"
                  required
                  autocomplete="new-password"
                />
                <button
                  class="absolute right-1 top-1 grid h-9 w-9 place-items-center border-0 bg-transparent text-slate-500"
                  type="button"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-[18px] w-[18px]" />
                  <Eye v-else class="h-[18px] w-[18px]" />
                </button>
              </div>
              <small v-if="errors.password" class="text-red-600">{{
                errors.password[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Confirm password
              <div class="relative">
                <input
                  v-model="form.password_confirmation"
                  :type="showPasswordConfirmation ? 'text' : 'password'"
                  class="w-full pr-11"
                  required
                  autocomplete="new-password"
                />
                <button
                  class="absolute right-1 top-1 grid h-9 w-9 place-items-center border-0 bg-transparent text-slate-500"
                  type="button"
                  :aria-label="
                    showPasswordConfirmation
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  "
                  @click="showPasswordConfirmation = !showPasswordConfirmation"
                >
                  <EyeOff
                    v-if="showPasswordConfirmation"
                    class="h-[18px] w-[18px]"
                  />
                  <Eye v-else class="h-[18px] w-[18px]" />
                </button>
              </div>
              <small
                v-if="errors.password_confirmation"
                class="text-red-600"
                >{{ errors.password_confirmation[0] }}</small
              >
            </label>
          </div>
          <div
            v-if="error"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {{ error }}
          </div>
          <button
            class="mb-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting || auth.loading"
          >
            {{ buttonLabel }}
          </button>
          <p class="text-center text-xs text-slate-600">
            Already have an account?
            <RouterLink class="font-bold text-teal-700" to="/login"
              >Sign in</RouterLink
            >
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
