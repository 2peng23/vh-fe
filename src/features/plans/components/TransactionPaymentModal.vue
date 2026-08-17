<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileImage,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Upload,
  X,
} from "lucide-vue-next";
import type { PaymentSubmissionPayload, PlanTransaction } from "../types";
import { formatPlanCurrency } from "../utils";

const props = defineProps<{
  transaction: PlanTransaction;
  qrUrl: string | null;
  loadingQr?: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: PaymentSubmissionPayload];
}>();

const paymentReference = ref("");
const proof = ref<File | null>(null);
const copiedField = ref<"account" | "reference" | null>(null);

const isPaid = computed(() => props.transaction.payment_status === "paid");
const isPendingVerification = computed(
  () => props.transaction.payment_status === "pending_verification",
);
const isRejected = computed(() => props.transaction.payment_status === "rejected");

const paymentMethod = computed(() => props.transaction.selected_payment_method);

const canSubmit = computed(
  () =>
    !props.submitting &&
    !isPendingVerification.value &&
    !isPaid.value &&
    (paymentReference.value.trim().length > 0 || proof.value !== null),
);

watch(
  () => props.transaction,
  (transaction) => {
    paymentReference.value = transaction.payment_reference ?? "";
    proof.value = null;
  },
  { immediate: true },
);

async function copyText(value: string, field: "account" | "reference") {
  if (!value) return;

  await navigator.clipboard.writeText(value);
  copiedField.value = field;

  window.setTimeout(() => {
    if (copiedField.value === field) copiedField.value = null;
  }, 1400);
}

function onProofChange(event: Event) {
  const input = event.target as HTMLInputElement;
  proof.value = input.files?.[0] ?? null;
}

function submitPayment() {
  if (!canSubmit.value) return;

  emit("submit", {
    payment_reference: paymentReference.value.trim(),
    proof: proof.value,
  });
}
</script>

<template>
  <div class="modal-backdrop payment-flow-backdrop" @click.self="emit('close')">
    <section
      class="modal payment-flow-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-flow-title"
    >
      <div class="payment-flow-header">
        <div>
          <span class="payment-eyebrow">SECURE MANUAL PAYMENT</span>
          <h2 id="payment-flow-title">
            {{ isPendingVerification ? "Payment submitted" : isPaid ? "Payment complete" : "Complete your payment" }}
          </h2>
          <p>{{ transaction.reference }}</p>
        </div>

        <button
          type="button"
          class="icon-btn"
          aria-label="Close payment"
          @click="emit('close')"
        >
          <X />
        </button>
      </div>

      <div v-if="isPendingVerification || isPaid" class="payment-success-state">
        <div class="success-icon" :class="{ paid: isPaid }">
          <CheckCircle2 :size="32" />
        </div>

        <span class="success-eyebrow">
          {{ isPaid ? "PAYMENT CONFIRMED" : "PAYMENT RECEIVED" }}
        </span>

        <h3>
          {{ isPaid ? "Your subscription payment is complete" : "We’re verifying your payment" }}
        </h3>

        <p v-if="isPaid">
          Your payment has been confirmed and your subscription is ready to use.
        </p>
        <p v-else>
          Your confirmation was submitted successfully. Your plan will be activated once the payment is verified.
        </p>

        <div class="success-summary">
          <div>
            <span>Transaction</span>
            <strong>{{ transaction.reference }}</strong>
          </div>
          <div>
            <span>Amount</span>
            <strong>{{ formatPlanCurrency(transaction.amount) }}</strong>
          </div>
          <div v-if="transaction.payment_reference">
            <span>Payment reference</span>
            <strong>{{ transaction.payment_reference }}</strong>
          </div>
        </div>

        <div v-if="!isPaid" class="verification-note">
          <Clock3 :size="17" />
          <div>
            <strong>Pending verification</strong>
            <span>You can safely close this window. The transaction status will update after review.</span>
          </div>
        </div>

        <button type="button" class="btn btn-primary done-button" @click="emit('close')">
          Done
        </button>
      </div>

      <div v-else class="payment-flow-body">
        <aside class="payment-summary-panel">
          <div class="summary-top">
            <span>Amount due</span>
            <strong>{{ formatPlanCurrency(transaction.amount) }}</strong>
            <small class="capitalize">{{ transaction.plan }} plan</small>
          </div>

          <div class="summary-divider"></div>

          <div class="payment-steps">
            <div class="payment-step active">
              <span>1</span>
              <div>
                <strong>Send payment</strong>
                <small>Use the QR code or account details.</small>
              </div>
            </div>

            <div class="payment-step active">
              <span>2</span>
              <div>
                <strong>Confirm payment</strong>
                <small>Add your reference number or screenshot.</small>
              </div>
            </div>

            <div class="payment-step">
              <span>3</span>
              <div>
                <strong>Verification</strong>
                <small>We verify before activating the plan.</small>
              </div>
            </div>
          </div>

          <div class="secure-note">
            <ShieldCheck :size="18" />
            <span>Only verified payments activate subscriptions.</span>
          </div>
        </aside>

        <div class="payment-content-panel">
          <div v-if="isRejected" class="payment-rejected-banner">
            <strong>Previous payment was rejected.</strong>
            <span>{{ transaction.payment_rejection_reason || "Please review the details and submit a new confirmation." }}</span>
          </div>

          <section class="payment-method-section">
            <div class="section-title-row">
              <div>
                <span class="section-number">01</span>
                <div>
                  <h3>Send your payment</h3>
                  <p>Pay the exact amount shown for this transaction.</p>
                </div>
              </div>

              <span class="method-chip">
                {{ paymentMethod?.name || transaction.payment_method || "Manual payment" }}
              </span>
            </div>

            <div class="payment-destination-grid">
              <div class="qr-panel">
                <div v-if="loadingQr" class="qr-placeholder">
                  <span class="qr-loader"></span>
                  <small>Loading QR code…</small>
                </div>

                <img
                  v-else-if="qrUrl"
                  :src="qrUrl"
                  :alt="`${paymentMethod?.name || 'Payment'} QR code`"
                />

                <div v-else class="qr-placeholder">
                  <QrCode :size="36" />
                  <small>No QR code available</small>
                </div>

                <span>Scan to pay</span>
              </div>

              <div class="account-details">
                <div class="detail-field">
                  <span>Account name</span>
                  <strong>{{ paymentMethod?.account_name || "—" }}</strong>
                </div>

                <div class="detail-field">
                  <span>Account number</span>
                  <div class="copy-value-row">
                    <strong>{{ paymentMethod?.account_number || "—" }}</strong>
                    <button
                      v-if="paymentMethod?.account_number"
                      type="button"
                      class="copy-button"
                      @click="copyText(paymentMethod.account_number, 'account')"
                    >
                      <Check v-if="copiedField === 'account'" :size="14" />
                      <Copy v-else :size="14" />
                      {{ copiedField === "account" ? "Copied" : "Copy" }}
                    </button>
                  </div>
                </div>

                <div class="detail-field highlight">
                  <span>Amount to send</span>
                  <strong>{{ formatPlanCurrency(transaction.amount) }}</strong>
                </div>

                <div class="detail-field">
                  <span>Transaction reference</span>
                  <div class="copy-value-row">
                    <strong>{{ transaction.reference }}</strong>
                    <button
                      type="button"
                      class="copy-button"
                      @click="copyText(transaction.reference, 'reference')"
                    >
                      <Check v-if="copiedField === 'reference'" :size="14" />
                      <Copy v-else :size="14" />
                      {{ copiedField === "reference" ? "Copied" : "Copy" }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="confirmation-section">
            <div class="section-title-row">
              <div>
                <span class="section-number">02</span>
                <div>
                  <h3>Confirm your payment</h3>
                  <p>Add a payment reference or upload a screenshot so your payment can be verified.</p>
                </div>
              </div>
            </div>

            <div class="confirmation-grid">
              <label class="form-field">
                <span>Payment reference <small>optional if screenshot is uploaded</small></span>
                <div class="input-with-icon">
                  <ReceiptText :size="16" />
                  <input
                    v-model="paymentReference"
                    type="text"
                    placeholder="e.g. GCash / bank reference number"
                    autocomplete="off"
                  />
                </div>
              </label>

              <label class="proof-upload" :class="{ selected: proof }">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  @change="onProofChange"
                />

                <div class="proof-icon">
                  <FileImage v-if="proof" :size="20" />
                  <Upload v-else :size="20" />
                </div>

                <div>
                  <strong>{{ proof ? proof.name : "Upload payment screenshot" }}</strong>
                  <span>{{ proof ? "Click to replace file" : "PNG, JPG, WEBP or PDF" }}</span>
                </div>
              </label>
            </div>

            <div class="confirmation-footer">
              <p>
                By submitting, you confirm that you have already sent the payment. This does not mark the subscription as paid until verification is complete.
              </p>

              <button
                type="button"
                class="btn btn-primary submit-payment-button"
                :disabled="!canSubmit"
                @click="submitPayment"
              >
                <span v-if="submitting">Submitting…</span>
                <span v-else>I’ve completed the payment</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.payment-flow-backdrop {
  z-index: 80;
  padding: 24px;
}

.payment-flow-modal {
  width: min(980px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
}

.payment-flow-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #e2e8f0;
  backdrop-filter: blur(10px);
}

.payment-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #0f766e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.payment-flow-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 21px;
}

.payment-flow-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 11px;
}

.payment-flow-body {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 560px;
}

.payment-summary-panel {
  padding: 26px 22px;
  color: #ffffff;
  background: linear-gradient(160deg, #0f766e 0%, #115e59 55%, #134e4a 100%);
}

.summary-top span,
.summary-top small {
  display: block;
  color: #ccfbf1;
  font-size: 10px;
}

.summary-top strong {
  display: block;
  margin: 7px 0 4px;
  font-size: 28px;
  line-height: 1.15;
}

.summary-divider {
  height: 1px;
  margin: 24px 0;
  background: rgba(255, 255, 255, 0.16);
}

.payment-steps {
  display: grid;
  gap: 18px;
}

.payment-step {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
  opacity: 0.55;
}

.payment-step.active {
  opacity: 1;
}

.payment-step > span {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #134e4a;
  background: #ffffff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
}

.payment-step strong,
.payment-step small {
  display: block;
}

.payment-step strong {
  font-size: 11px;
}

.payment-step small {
  margin-top: 3px;
  color: #ccfbf1;
  font-size: 9px;
  line-height: 1.45;
}

.secure-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 30px;
  padding: 12px;
  color: #d1fae5;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  font-size: 9px;
  line-height: 1.5;
}

.payment-content-panel {
  display: grid;
  align-content: start;
  gap: 0;
  background: #ffffff;
}

.payment-rejected-banner {
  display: grid;
  gap: 3px;
  margin: 20px 24px 0;
  padding: 12px 14px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 10px;
}

.payment-method-section,
.confirmation-section {
  padding: 24px;
}

.confirmation-section {
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.section-title-row,
.section-title-row > div {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.section-title-row {
  justify-content: space-between;
}

.section-number {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 900;
}

.section-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
}

.section-title-row p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.45;
}

.method-chip {
  padding: 6px 9px;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.payment-destination-grid {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 18px;
  margin-top: 20px;
}

.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.qr-panel img,
.qr-placeholder {
  width: 150px;
  height: 150px;
  object-fit: contain;
  border-radius: 10px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.qr-panel > span,
.qr-placeholder small {
  color: #64748b;
  font-size: 9px;
  font-weight: 700;
}

.qr-loader {
  width: 26px;
  height: 26px;
  border: 3px solid #ccfbf1;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.account-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-field {
  min-width: 0;
  padding: 13px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
}

.detail-field.highlight {
  background: #f0fdfa;
  border-color: #ccfbf1;
}

.detail-field > span {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
  font-size: 9px;
}

.detail-field strong {
  color: #0f172a;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.copy-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  color: #0f766e;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
}

.confirmation-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.form-field > span {
  display: block;
  margin-bottom: 7px;
  color: #334155;
  font-size: 10px;
  font-weight: 700;
}

.form-field > span small {
  color: #94a3b8;
  font-size: 8px;
  font-weight: 500;
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  color: #94a3b8;
  background: #ffffff;
  border: 1px solid #dbe3ed;
  border-radius: 10px;
}

.input-with-icon:focus-within {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}

.input-with-icon input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 11px;
}

.proof-upload {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 11px 12px;
  cursor: pointer;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}

.proof-upload.selected {
  border-style: solid;
  border-color: #5eead4;
  background: #f0fdfa;
}

.proof-upload input {
  display: none;
}

.proof-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  background: #f0fdfa;
  border-radius: 9px;
}

.proof-upload strong,
.proof-upload span {
  display: block;
}

.proof-upload strong {
  max-width: 210px;
  color: #334155;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-upload span {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 8px;
}

.confirmation-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 16px;
}

.confirmation-footer p {
  max-width: 430px;
  margin: 0;
  color: #64748b;
  font-size: 9px;
  line-height: 1.5;
}

.submit-payment-button {
  min-height: 42px;
  padding-inline: 18px;
  white-space: nowrap;
}

.payment-success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 32px 40px;
  text-align: center;
}

.success-icon {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a16207;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 50%;
}

.success-icon.paid {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.success-eyebrow {
  margin-top: 18px;
  color: #0f766e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.payment-success-state h3 {
  margin: 7px 0 6px;
  color: #0f172a;
  font-size: 20px;
}

.payment-success-state > p {
  max-width: 520px;
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.success-summary {
  width: min(560px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 24px;
}

.success-summary div {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.success-summary span,
.success-summary strong {
  display: block;
}

.success-summary span {
  color: #94a3b8;
  font-size: 8px;
  text-transform: uppercase;
}

.success-summary strong {
  margin-top: 4px;
  color: #334155;
  font-size: 10px;
}

.verification-note {
  width: min(560px, 100%);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  text-align: left;
}

.verification-note strong,
.verification-note span {
  display: block;
}

.verification-note strong {
  font-size: 10px;
}

.verification-note span {
  margin-top: 3px;
  color: #a16207;
  font-size: 9px;
  line-height: 1.4;
}

.done-button {
  min-width: 120px;
  margin-top: 22px;
}

@media (max-width: 820px) {
  .payment-flow-body {
    grid-template-columns: 1fr;
  }

  .payment-summary-panel {
    display: none;
  }
}

@media (max-width: 640px) {
  .payment-flow-backdrop {
    padding: 0;
  }

  .payment-flow-modal {
    width: 100%;
    min-height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .payment-destination-grid,
  .confirmation-grid,
  .account-details {
    grid-template-columns: 1fr;
  }

  .qr-panel {
    width: 100%;
  }

  .confirmation-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .submit-payment-button {
    width: 100%;
  }

  .success-summary {
    grid-template-columns: 1fr;
  }
}
</style>
