<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, CalendarDays, CarFront, Clock3, CreditCard } from "lucide-vue-next";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import api, { errorMessage } from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ApiEnvelope } from "../types";
import type {
  EnrichedPlanGroup,
  PaymentMethod,
  PlanOffering,
  PlanTransaction,
  SelectedOffering,
  SubscriptionPreview,
} from "../features/plans/types";
import { PLAN_BENEFITS } from "../features/plans/constants";
import PlanPurchaseView from "../features/plans/components/PlanPurchaseView.vue";
import { buildPlanGroups, formatPlanCurrency } from "../features/plans/utils";
import { formatDate } from "../utils";

const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const loadingPreview = ref(false);
const purchasing = ref(false);
const error = ref("");
const success = ref("");
const offerings = ref<PlanOffering[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const preview = ref<SubscriptionPreview | null>(null);
const purchaseForm = ref({
  subscription_plan_offering_id: "",
  payment_method_id: "",
});

const subscription = computed(() => auth.user?.business?.subscription);
const business = computed(() => auth.user?.business);
const planGroups = computed<EnrichedPlanGroup[]>(() => buildPlanGroups(offerings.value));
const selectedOffering = computed<SelectedOffering | null>(() => {
  for (const group of planGroups.value) {
    const offering = group.offerings.find(
      (item) => String(item.id) === purchaseForm.value.subscription_plan_offering_id,
    );

    if (offering) {
      return {
        ...offering,
        plan_name: group.name,
        vehicle_limit: group.vehicleLimit,
      };
    }
  }

  return null;
});
const selectedPaymentMethod = computed(() =>
  paymentMethods.value.find(
    (method) => String(method.id) === purchaseForm.value.payment_method_id,
  ),
);

async function loadOptions() {
  loading.value = true;
  error.value = "";

  try {
    await auth.fetchMe();
    const [plansResponse, methodsResponse] = await Promise.all([
      api.get<ApiEnvelope<PlanOffering[]>>("/plan-offerings"),
      api.get<ApiEnvelope<PaymentMethod[]>>("/payment-methods"),
    ]);

    offerings.value = plansResponse.data.data.filter(
      (offering) => offering.plan !== "trial",
    );
    paymentMethods.value = methodsResponse.data.data;

    const currentTier = subscription.value?.tier;
    const defaultOffering =
      offerings.value.find(
        (offering) =>
          offering.plan !== currentTier && Number(offering.duration_months) === 1,
      ) ??
      offerings.value.find((offering) => Number(offering.duration_months) === 1) ??
      offerings.value[0];

    purchaseForm.value = {
      subscription_plan_offering_id: String(defaultOffering?.id ?? ""),
      payment_method_id: String(paymentMethods.value[0]?.id ?? ""),
    };

    await loadPreview();
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    loading.value = false;
  }
}

async function loadPreview() {
  if (!purchaseForm.value.subscription_plan_offering_id) {
    preview.value = null;
    return;
  }

  loadingPreview.value = true;
  error.value = "";

  try {
    const { data } = await api.post<ApiEnvelope<SubscriptionPreview>>(
      "/subscription/preview",
      {
        subscription_plan_offering_id:
          purchaseForm.value.subscription_plan_offering_id,
      },
    );

    preview.value = data.data;
  } catch (exception) {
    preview.value = null;
    error.value = errorMessage(exception);
  } finally {
    loadingPreview.value = false;
  }
}

async function purchasePlan() {
  purchasing.value = true;
  error.value = "";
  success.value = "";

  try {
    const { data } = await api.post<ApiEnvelope<PlanTransaction>>(
      "/plan-transactions",
      purchaseForm.value,
    );

    success.value = "Transaction created. Continue with payment verification.";
    await router.push({
      path: "/plan-transactions",
      query: { pay: String(data.data.id) },
    });
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    purchasing.value = false;
  }
}

onMounted(loadOptions);

watch(
  () => purchaseForm.value.subscription_plan_offering_id,
  () => {
    if (!loading.value) void loadPreview();
  },
);
</script>

<template>
  <div>
    <PageHeader
      title="Subscription"
      description="Review your active plan, remaining time, vehicle usage, and available plan changes."
    >
      <button class="btn" type="button" @click="router.push('/plan-transactions')">
        <CreditCard />
        Transactions
      </button>
    </PageHeader>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="success" class="alert">{{ success }}</div>

    <LoadingState v-if="loading" />

    <template v-else>
      <section class="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <article class="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-5 flex items-start justify-between gap-4">
            <span class="text-[10px] font-extrabold uppercase text-slate-500">Active Subscription</span>
            <strong class="text-[22px] font-extrabold text-slate-900">{{ subscription?.label || business?.subscription_plan || "Trial" }}</strong>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <CalendarDays class="h-[18px] w-[18px] text-teal-700" />
              <span class="mt-2.5 block text-[10px] font-extrabold uppercase text-slate-500">Started</span>
              <strong class="mt-1 block text-[15px] font-extrabold text-slate-900">{{ formatDate(subscription?.plan_started_at) }}</strong>
            </div>
            <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <CalendarDays class="h-[18px] w-[18px] text-teal-700" />
              <span class="mt-2.5 block text-[10px] font-extrabold uppercase text-slate-500">Expires</span>
              <strong class="mt-1 block text-[15px] font-extrabold text-slate-900">{{ formatDate(subscription?.plan_ends_at) }}</strong>
            </div>
            <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <Clock3 class="h-[18px] w-[18px] text-teal-700" />
              <span class="mt-2.5 block text-[10px] font-extrabold uppercase text-slate-500">Remaining</span>
              <strong class="mt-1 block text-[15px] font-extrabold text-slate-900">{{ subscription?.remaining_days ?? 0 }} days</strong>
            </div>
            <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <CarFront class="h-[18px] w-[18px] text-teal-700" />
              <span class="mt-2.5 block text-[10px] font-extrabold uppercase text-slate-500">Vehicle Usage</span>
              <strong class="mt-1 block text-[15px] font-extrabold text-slate-900">{{ subscription?.vehicle_count ?? 0 }} / {{ subscription?.vehicle_limit ?? 0 }}</strong>
            </div>
          </div>

          <div class="mt-5 h-[9px] overflow-hidden rounded-full bg-slate-200">
            <i class="block h-full bg-teal-700" :style="{ width: `${subscription?.usage_percent ?? 0}%` }"></i>
          </div>

          <p v-if="subscription?.vehicle_limit_reached" class="mt-3.5 text-xs leading-6 text-amber-700">
            Your current plan limit is reached. Existing vehicles remain available, but new vehicles are blocked until usage is below the limit or the subscription is upgraded.
          </p>
        </article>

        <article class="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-5 flex items-start justify-between gap-4">
            <span class="text-[10px] font-extrabold uppercase text-slate-500">Selected Change</span>
            <strong class="text-[22px] font-extrabold capitalize text-slate-900">{{ loadingPreview ? "Calculating" : preview?.type || "Choose a plan" }}</strong>
          </div>

          <dl v-if="preview" class="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">From</dt>
              <dd class="mt-1 text-sm font-extrabold capitalize text-slate-900">{{ preview.from_plan }}</dd>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">To</dt>
              <dd class="mt-1 text-sm font-extrabold capitalize text-slate-900">{{ preview.to_plan }}</dd>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">Credit</dt>
              <dd class="mt-1 text-sm font-extrabold text-slate-900">{{ formatPlanCurrency(preview.credit_amount) }}</dd>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">Amount due</dt>
              <dd class="mt-1 text-sm font-extrabold text-slate-900">{{ formatPlanCurrency(preview.amount_due) }}</dd>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">Starts</dt>
              <dd class="mt-1 text-sm font-extrabold text-slate-900">{{ formatDate(preview.new_starts_at) }}</dd>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[10px] font-extrabold uppercase text-slate-500">Ends</dt>
              <dd class="mt-1 text-sm font-extrabold text-slate-900">{{ formatDate(preview.new_ends_at) }}</dd>
            </div>
          </dl>

          <button
            class="btn btn-primary btn-block"
            type="button"
            :disabled="!selectedOffering || !selectedPaymentMethod || purchasing"
            @click="purchasePlan"
          >
            {{ purchasing ? "Creating transaction..." : "Continue to payment" }}
            <ArrowRight />
          </button>
        </article>
      </section>

      <PlanPurchaseView
        :plan-groups="planGroups"
        :benefits="PLAN_BENEFITS"
        :selected-offering-id="purchaseForm.subscription_plan_offering_id"
        :selected-offering="selectedOffering"
        :payment-methods="paymentMethods"
        :selected-payment-method="selectedPaymentMethod"
        :payment-method-id="purchaseForm.payment_method_id"
        :purchasing="purchasing"
        :preview="preview"
        :loading-preview="loadingPreview"
        :current-subscription="subscription"
        @update:selected-offering-id="purchaseForm.subscription_plan_offering_id = $event"
        @update:payment-method-id="purchaseForm.payment_method_id = $event"
        @purchase="purchasePlan"
      />
    </template>
  </div>
</template>
