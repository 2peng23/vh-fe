<script setup lang="ts">
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  WalletCards,
} from "lucide-vue-next";

import type {
  PaymentMethod,
  SelectedOffering,
  SubscriptionPreview,
} from "../types";

import {
  billingPeriodLabel,
  formatPlanCurrency,
  formatPlanDate,
} from "../utils";

defineProps<{
  selectedOffering: SelectedOffering | null;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod?: PaymentMethod;
  paymentMethodId: string;
  purchasing: boolean;
  preview: SubscriptionPreview | null;
  loadingPreview: boolean;
}>();

const emit = defineEmits<{
  "update:paymentMethodId": [value: string];
  submit: [];
}>();
</script>

<template>
  <section
    class="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
  >
    <!-- Header -->
    <div
      class="border-b border-slate-100 bg-gradient-to-r from-teal-50/70 via-white to-white px-5 py-5 sm:px-6 lg:px-7"
    >
      <div class="flex items-start gap-3">
        <div
          class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700"
        >
          <CheckCircle2 class="h-5 w-5" />
        </div>

        <div class="min-w-0">
          <span
            class="text-[10px] font-extrabold uppercase tracking-[1.4px] text-teal-700"
          >
            Almost there
          </span>

          <h3
            class="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl"
          >
            Complete your purchase
          </h3>

          <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
            Review your selected subscription, confirm the amount, and choose
            where to send your payment.
          </p>
        </div>
      </div>
    </div>

    <!-- Checkout body -->
    <div class="p-5 sm:p-6 lg:p-7">
      <div
        v-if="selectedOffering"
        class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(280px,0.85fr)]"
      >
        <!-- Selected Plan -->
        <article
          class="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-5"
        >
          <div class="mb-5 flex items-center justify-between gap-3">
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-teal-700"
            >
              <ReceiptText class="h-[18px] w-[18px]" />
            </div>

            <span
              v-if="selectedOffering.discount_percent > 0"
              class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700"
            >
              Save {{ selectedOffering.discount_percent }}%
            </span>
          </div>

          <span
            class="text-[10px] font-extrabold uppercase tracking-[1px] text-slate-400"
          >
            Selected plan
          </span>

          <strong
            class="mt-2 block text-2xl font-extrabold capitalize tracking-tight text-slate-950"
          >
            {{ selectedOffering.plan_name }}
          </strong>

          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-xs font-semibold text-slate-500">
              {{ billingPeriodLabel(Number(selectedOffering.duration_months)) }}
            </span>

            <span class="h-1 w-1 rounded-full bg-slate-300"></span>

            <span class="text-xs font-semibold text-slate-500">
              {{ selectedOffering.vehicle_limit }} vehicles
            </span>
          </div>

          <div class="mt-auto pt-8">
            <span class="block text-[10px] font-bold uppercase text-slate-400">
              Amount due
            </span>

            <strong
              class="mt-1 block break-words text-[28px] font-extrabold tracking-tight text-slate-950"
            >
              {{
                preview
                  ? formatPlanCurrency(preview.amount_due)
                  : formatPlanCurrency(selectedOffering.price)
              }}
            </strong>
          </div>
        </article>

        <!-- Plan Change Preview -->
        <article
          class="min-w-0 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <span
                class="block text-[10px] font-extrabold uppercase tracking-[1px] text-teal-700"
              >
                {{
                  loadingPreview
                    ? "Calculating"
                    : (preview?.type ?? "Plan change")
                }}
              </span>

              <h4 class="mt-1 text-base font-extrabold text-slate-900">
                Payment summary
              </h4>
            </div>

            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"
            >
              <WalletCards class="h-[18px] w-[18px]" />
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loadingPreview" class="space-y-3">
            <div class="h-4 w-full animate-pulse rounded bg-slate-100"></div>
            <div class="h-4 w-4/5 animate-pulse rounded bg-slate-100"></div>
            <div class="h-px w-full bg-slate-100"></div>
            <div class="h-5 w-2/3 animate-pulse rounded bg-slate-100"></div>
          </div>

          <!-- Upgrade / Purchase -->
          <template
            v-else-if="
              preview?.type === 'upgrade' || preview?.type === 'purchase'
            "
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="min-w-0 text-slate-600">
                  {{ selectedOffering.plan_name }} Plan
                </span>

                <strong class="shrink-0 font-extrabold text-slate-900">
                  {{ formatPlanCurrency(preview.original_price) }}
                </strong>
              </div>

              <div
                v-if="Number(preview.credit_amount) > 0"
                class="flex items-start justify-between gap-4 text-sm"
              >
                <span class="min-w-0 text-slate-600">
                  Unused {{ preview.from_plan }} credit
                </span>

                <strong class="shrink-0 font-extrabold text-emerald-700">
                  -{{ formatPlanCurrency(preview.credit_amount) }}
                </strong>
              </div>
            </div>

            <div class="my-4 border-t border-dashed border-slate-200"></div>

            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-extrabold text-slate-900">
                Amount to Pay
              </span>

              <strong class="text-lg font-extrabold text-slate-950">
                {{ formatPlanCurrency(preview.amount_due) }}
              </strong>
            </div>

            <div
              class="mt-5 rounded-lg border border-teal-100 bg-teal-50/70 px-3.5 py-3"
            >
              <p class="text-xs leading-5 text-teal-800">
                Your
                <strong>{{ selectedOffering.plan_name }}</strong>
                plan will become active immediately after payment verification.
              </p>
            </div>
          </template>

          <!-- Renewal -->
          <template v-else-if="preview?.type === 'renewal'">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="text-slate-600"> Current expiration </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ formatPlanDate(preview.current_ends_at) }}
                </strong>
              </div>

              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="text-slate-600"> Additional period </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ billingPeriodLabel(preview.duration_months) }}
                </strong>
              </div>

              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="text-slate-600"> New expiration </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ formatPlanDate(preview.new_ends_at) }}
                </strong>
              </div>
            </div>

            <div class="my-4 border-t border-dashed border-slate-200"></div>

            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-extrabold text-slate-900">
                Amount to Pay
              </span>

              <strong class="text-lg font-extrabold text-slate-950">
                {{ formatPlanCurrency(preview.amount_due) }}
              </strong>
            </div>
          </template>

          <!-- Downgrade -->
          <template v-else-if="preview?.type === 'downgrade'">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="max-w-[55%] text-slate-600">
                  {{ preview.from_plan }} remains active until
                </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ formatPlanDate(preview.current_ends_at) }}
                </strong>
              </div>

              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="max-w-[55%] text-slate-600">
                  {{ selectedOffering.plan_name }} begins
                </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ formatPlanDate(preview.new_starts_at) }}
                </strong>
              </div>

              <div class="flex items-start justify-between gap-4 text-sm">
                <span class="text-slate-600"> New vehicle limit </span>

                <strong class="text-right font-bold text-slate-900">
                  {{ preview.vehicle_limit }} vehicles
                </strong>
              </div>
            </div>

            <div class="my-4 border-t border-dashed border-slate-200"></div>

            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-extrabold text-slate-900">
                Amount to Pay
              </span>

              <strong class="text-lg font-extrabold text-slate-950">
                {{ formatPlanCurrency(preview.amount_due) }}
              </strong>
            </div>
          </template>

          <!-- No preview -->
          <div
            v-else
            class="grid min-h-[150px] place-items-center rounded-lg bg-slate-50 px-4 text-center"
          >
            <p class="text-xs leading-5 text-slate-500">
              Select a plan to see your payment summary.
            </p>
          </div>
        </article>

        <!-- Payment -->
        <article
          class="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 xl:col-span-1"
        >
          <div class="mb-5 flex items-center gap-3">
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700"
            >
              <CreditCard class="h-[18px] w-[18px]" />
            </div>

            <div>
              <span
                class="block text-[10px] font-extrabold uppercase tracking-[1px] text-slate-400"
              >
                Pay with
              </span>

              <h4 class="mt-0.5 text-base font-extrabold text-slate-900">
                Payment method
              </h4>
            </div>
          </div>

          <label
            for="purchase-payment-method"
            class="mb-2 block text-xs font-extrabold text-slate-700"
          >
            Select payment method
          </label>

          <select
            id="purchase-payment-method"
            :value="paymentMethodId"
            required
            class="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            @change="
              emit(
                'update:paymentMethodId',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option
              v-for="method in paymentMethods"
              :key="method.id"
              :value="String(method.id)"
            >
              {{ method.name }}
            </option>
          </select>

          <!-- Payment destination -->
          <div
            v-if="selectedPaymentMethod"
            class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5"
          >
            <span
              class="block text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >
              Payment will be sent to
            </span>

            <strong
              class="mt-2 block break-words text-sm font-extrabold text-slate-900"
            >
              {{ selectedPaymentMethod.account_name }}
            </strong>

            <span
              class="mt-1 block break-all text-xs font-medium text-slate-500"
            >
              {{ selectedPaymentMethod.account_number }}
            </span>
          </div>

          <div
            v-else
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          >
            <p class="text-xs font-semibold leading-5 text-red-700">
              No payment method is currently available. Please contact support.
            </p>
          </div>

          <!-- Button -->
          <button
            type="button"
            class="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="
              purchasing ||
              !selectedOffering ||
              !paymentMethodId ||
              !selectedPaymentMethod
            "
            @click="emit('submit')"
          >
            <span>
              {{ purchasing ? "Creating transaction…" : "Continue to payment" }}
            </span>

            <ArrowRight v-if="!purchasing" class="h-[17px] w-[17px]" />

            <span
              v-else
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            ></span>
          </button>
        </article>
      </div>

      <!-- No selected plan -->
      <div
        v-else
        class="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
      >
        <div>
          <div
            class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <ReceiptText class="h-5 w-5" />
          </div>

          <strong class="mt-4 block text-sm font-extrabold text-slate-800">
            Choose a subscription
          </strong>

          <p class="mt-1 text-xs text-slate-500">
            Select one of the plans above to continue.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
