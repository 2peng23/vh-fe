<script setup lang="ts">
import type { PaymentMethod, SelectedOffering } from "../types";
import { billingPeriodLabel, formatPlanCurrency } from "../utils";

defineProps<{
  selectedOffering: SelectedOffering | null;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod?: PaymentMethod;
  paymentMethodId: string;
  purchasing: boolean;
}>();

const emit = defineEmits<{
  "update:paymentMethodId": [value: string];
  submit: [];
}>();
</script>

<template>
  <div class="plan-purchase-checkout card">
    <div class="checkout-heading">
      <div>
        <span class="pricing-eyebrow">ALMOST THERE</span>
        <h3>Complete your purchase</h3>
        <p>
          Review your selected subscription and choose where to send your
          payment.
        </p>
      </div>
    </div>

    <div v-if="selectedOffering" class="checkout-selected-plan">
      <div class="checkout-selected-info">
        <span>Selected plan</span>
        <strong>{{ selectedOffering.plan_name }}</strong>
        <small>
          {{ billingPeriodLabel(Number(selectedOffering.duration_months)) }} ·
          {{ selectedOffering.vehicle_limit }} vehicles
        </small>
      </div>

      <div class="checkout-selected-price">
        <span
          v-if="selectedOffering.discount_percent > 0"
          class="checkout-selected-discount"
        >
          Save {{ selectedOffering.discount_percent }}%
        </span>
        <strong>{{ formatPlanCurrency(selectedOffering.price) }}</strong>
      </div>
    </div>

    <div class="checkout-content">
      <div class="plan-payment-field">
        <label for="purchase-payment-method">Payment method</label>

        <select
          id="purchase-payment-method"
          :value="paymentMethodId"
          required
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

        <div v-if="selectedPaymentMethod" class="payment-destination">
          <span>Payment will be sent to</span>
          <strong>{{ selectedPaymentMethod.account_name }}</strong>
          <span>{{ selectedPaymentMethod.account_number }}</span>
        </div>

        <p v-else class="error-text">
          No payment method is currently available. Please contact support.
        </p>
      </div>

      <button
        class="btn btn-primary purchase-button"
        type="button"
        :disabled="purchasing || !selectedOffering || !paymentMethodId"
        @click="emit('submit')"
      >
        {{ purchasing ? "Creating transaction…" : "Continue to payment" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pricing-eyebrow {
  display: inline-block;
  color: #0f766e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.plan-purchase-checkout {
  margin-top: 28px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 17px;
}

.checkout-heading {
  padding: 22px 24px;
  background: linear-gradient(135deg, #f0fdfa, #ffffff);
  border-bottom: 1px solid #e2e8f0;
}

.checkout-heading h3 {
  margin: 4px 0;
  color: #0f172a;
  font-size: 19px;
}

.checkout-heading p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
}

.checkout-selected-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 20px 24px 0;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.checkout-selected-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.checkout-selected-info > span {
  color: #94a3b8;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.checkout-selected-info strong {
  color: #0f172a;
  font-size: 16px;
}

.checkout-selected-info small {
  color: #64748b;
  font-size: 10px;
}

.checkout-selected-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.checkout-selected-price strong {
  color: #0f172a;
  font-size: 20px;
}

.checkout-selected-discount {
  padding: 4px 7px;
  color: #15803d;
  background: #dcfce7;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
}

.checkout-content {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding: 20px 24px 24px;
}

.plan-payment-field {
  flex: 1;
  min-width: 0;
}

.plan-payment-field label {
  display: block;
  margin-bottom: 7px;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
}

.plan-payment-field select {
  width: 100%;
}

.payment-destination {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  color: #64748b;
  font-size: 10px;
}

.payment-destination strong {
  color: #334155;
}

.purchase-button {
  min-height: 44px;
  padding-left: 23px;
  padding-right: 23px;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .checkout-selected-plan {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .checkout-selected-plan {
    flex-direction: column;
  }

  .checkout-selected-price {
    align-items: flex-start;
  }

  .checkout-content {
    flex-direction: column;
    align-items: stretch;
  }

  .purchase-button {
    width: 100%;
  }
}
</style>
