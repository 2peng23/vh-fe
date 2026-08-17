<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileImage,
  ReceiptText,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-vue-next";
import { formatDate, formatDateTime } from "../../../../utils/date";
import type {
  PaymentReviewAction,
  PaymentReviewPayload,
  ReviewableAdminTransaction,
} from "./types";
import {
  formatAdminTransactionCurrency,
  isPaymentPaid,
  isPaymentPending,
  isPaymentRejected,
} from "./utils";

const props = defineProps<{
  transaction: ReviewableAdminTransaction;
  proofUrl: string | null;
  proofContentType?: string | null;
  loadingProof?: boolean;
  reviewing?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  review: [payload: PaymentReviewPayload];
  "open-business": [transaction: ReviewableAdminTransaction];
}>();

const copiedField = ref<"payment-reference" | "transaction-reference" | null>(null);
const rejectionReason = ref("");
const confirmAction = ref<PaymentReviewAction | null>(null);

const paymentMethod = computed(() => props.transaction.selected_payment_method);
const paid = computed(() => isPaymentPaid(props.transaction));
const pending = computed(() => isPaymentPending(props.transaction));
const rejected = computed(() => isPaymentRejected(props.transaction));
const proofIsImage = computed(() =>
  Boolean(props.proofContentType?.toLowerCase().startsWith("image/")),
);

const canReject = computed(
  () => !props.reviewing && rejectionReason.value.trim().length >= 3,
);

watch(
  () => props.transaction.id,
  () => {
    rejectionReason.value = props.transaction.payment_rejection_reason ?? "";
    confirmAction.value = null;
  },
  { immediate: true },
);

async function copyText(
  value: string,
  field: "payment-reference" | "transaction-reference",
) {
  if (!value) return;

  await navigator.clipboard.writeText(value);
  copiedField.value = field;

  window.setTimeout(() => {
    if (copiedField.value === field) copiedField.value = null;
  }, 1400);
}

function requestApprove() {
  if (!pending.value || props.reviewing) return;
  confirmAction.value = "approve";
}

function requestReject() {
  if (!pending.value || props.reviewing) return;
  confirmAction.value = "reject";
}

function cancelConfirmation() {
  confirmAction.value = null;
}

function submitReview() {
  if (!confirmAction.value || props.reviewing) return;

  if (confirmAction.value === "reject" && !canReject.value) return;

  emit("review", {
    action: confirmAction.value,
    rejection_reason:
      confirmAction.value === "reject"
        ? rejectionReason.value.trim()
        : undefined,
  });
}
</script>

<template>
  <div class="modal-backdrop payment-review-backdrop" @click.self="emit('close')">
    <section
      class="modal payment-review-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-review-title"
    >
      <div class="payment-review-header">
        <div>
          <span class="payment-eyebrow">SUPERADMIN PAYMENT REVIEW</span>
          <h2 id="payment-review-title">
            {{
              pending
                ? "Review submitted payment"
                : paid
                  ? "Payment verified"
                  : rejected
                    ? "Payment rejected"
                    : "Transaction payment"
            }}
          </h2>
          <p>{{ transaction.reference || `Transaction #${transaction.id}` }}</p>
        </div>

        <button
          type="button"
          class="icon-btn"
          aria-label="Close payment review"
          @click="emit('close')"
        >
          <X />
        </button>
      </div>

      <div class="payment-review-body">
        <aside class="payment-summary-panel">
          <div class="summary-top">
            <span>Amount submitted</span>
            <strong>{{ formatAdminTransactionCurrency(transaction.amount) }}</strong>
            <small class="capitalize">{{ transaction.plan }} plan</small>
          </div>

          <div class="business-summary">
            <span class="business-summary-icon">
              <Building2 :size="17" />
            </span>
            <div>
              <small>Business</small>
              <button
                type="button"
                @click="emit('open-business', transaction)"
              >
                {{ transaction.business?.name || "Unknown business" }}
              </button>
              <span>{{ transaction.business?.email || "—" }}</span>
            </div>
          </div>

          <div class="summary-divider"></div>

          <div class="payment-steps">
            <div class="payment-step active">
              <span>1</span>
              <div>
                <strong>Owner submitted payment</strong>
                <small>Reference number or proof has been provided.</small>
              </div>
            </div>

            <div class="payment-step" :class="{ active: pending || paid || rejected }">
              <span>2</span>
              <div>
                <strong>Admin verification</strong>
                <small>Review the submitted information before deciding.</small>
              </div>
            </div>

            <div class="payment-step" :class="{ active: paid }">
              <span>3</span>
              <div>
                <strong>Subscription activation</strong>
                <small>Approved payments activate or extend the plan.</small>
              </div>
            </div>
          </div>

          <div class="secure-note">
            <ShieldCheck :size="18" />
            <span>Only approve after confirming that the payment was actually received.</span>
          </div>
        </aside>

        <div class="payment-content-panel">
          <div v-if="paid" class="review-state-banner success">
            <CheckCircle2 :size="20" />
            <div>
              <strong>Payment already verified</strong>
              <span>This transaction has been approved and marked as paid.</span>
            </div>
          </div>

          <div v-else-if="rejected" class="review-state-banner rejected">
            <XCircle :size="20" />
            <div>
              <strong>Payment was rejected</strong>
              <span>
                {{
                  transaction.payment_rejection_reason ||
                  "The owner can submit another payment confirmation."
                }}
              </span>
            </div>
          </div>

          <div v-else-if="!pending" class="review-state-banner waiting">
            <Clock3 :size="20" />
            <div>
              <strong>No payment confirmation yet</strong>
              <span>The owner has not submitted a payment reference or proof for review.</span>
            </div>
          </div>

          <section class="review-section">
            <div class="section-title-row">
              <div>
                <span class="section-number">01</span>
                <div>
                  <h3>Payment details</h3>
                  <p>Compare the submitted details with your payment account records.</p>
                </div>
              </div>

              <span class="method-chip">
                {{ paymentMethod?.name || transaction.payment_method || "Manual payment" }}
              </span>
            </div>

            <div class="detail-grid">
              <div class="detail-field">
                <span>Account name</span>
                <strong>{{ paymentMethod?.account_name || "—" }}</strong>
              </div>

              <div class="detail-field">
                <span>Account number</span>
                <strong>{{ paymentMethod?.account_number || "—" }}</strong>
              </div>

              <div class="detail-field highlight">
                <span>Amount expected</span>
                <strong>{{ formatAdminTransactionCurrency(transaction.amount) }}</strong>
              </div>

              <div class="detail-field">
                <span>Transaction reference</span>
                <div class="copy-value-row">
                  <strong>{{ transaction.reference || "—" }}</strong>
                  <button
                    v-if="transaction.reference"
                    type="button"
                    class="copy-button"
                    @click="copyText(transaction.reference, 'transaction-reference')"
                  >
                    <Check v-if="copiedField === 'transaction-reference'" :size="14" />
                    <Copy v-else :size="14" />
                    {{ copiedField === "transaction-reference" ? "Copied" : "Copy" }}
                  </button>
                </div>
              </div>

              <div class="detail-field payment-reference-field">
                <span>Owner payment reference</span>
                <div class="copy-value-row">
                  <strong>{{ transaction.payment_reference || "Not provided" }}</strong>
                  <button
                    v-if="transaction.payment_reference"
                    type="button"
                    class="copy-button"
                    @click="copyText(transaction.payment_reference, 'payment-reference')"
                  >
                    <Check v-if="copiedField === 'payment-reference'" :size="14" />
                    <Copy v-else :size="14" />
                    {{ copiedField === "payment-reference" ? "Copied" : "Copy" }}
                  </button>
                </div>
              </div>

              <div class="detail-field">
                <span>Submitted at</span>
                <strong>
                  {{
                    transaction.payment_submitted_at
                      ? formatDateTime(transaction.payment_submitted_at)
                      : "—"
                  }}
                </strong>
              </div>
            </div>
          </section>

          <section class="review-section proof-section">
            <div class="section-title-row">
              <div>
                <span class="section-number">02</span>
                <div>
                  <h3>Payment proof</h3>
                  <p>Open the owner's uploaded screenshot or receipt before approving.</p>
                </div>
              </div>
            </div>

            <div class="proof-card">
              <div v-if="loadingProof" class="proof-placeholder">
                <span class="proof-loader"></span>
                <strong>Loading payment proof…</strong>
                <small>Please wait while the private file is loaded.</small>
              </div>

              <template v-else-if="proofUrl">
                <img
                  v-if="proofIsImage"
                  :src="proofUrl"
                  alt="Submitted payment proof"
                  class="proof-image"
                />

                <div v-else class="proof-file">
                  <span class="proof-file-icon">
                    <FileImage :size="26" />
                  </span>
                  <div>
                    <strong>Payment proof attached</strong>
                    <small>The file cannot be previewed inline.</small>
                  </div>
                </div>

                <a
                  :href="proofUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-small proof-open-button"
                >
                  <ExternalLink :size="14" />
                  Open proof
                </a>
              </template>

              <div v-else class="proof-placeholder empty">
                <ReceiptText :size="28" />
                <strong>No payment proof uploaded</strong>
                <small>Use the payment reference and account records to verify this payment.</small>
              </div>
            </div>
          </section>

          <section class="review-section decision-section">
            <div class="section-title-row">
              <div>
                <span class="section-number">03</span>
                <div>
                  <h3>Verification decision</h3>
                  <p>Approve only after confirming the payment was received.</p>
                </div>
              </div>
            </div>

            <template v-if="pending">
              <div class="decision-warning">
                <AlertTriangle :size="17" />
                <span>
                  Approval should mark the payment as paid and activate or extend the subscription.
                </span>
              </div>

              <div v-if="confirmAction === 'reject'" class="reject-reason-card">
                <label>
                  Rejection reason
                  <textarea
                    v-model.trim="rejectionReason"
                    rows="3"
                    placeholder="Explain what is wrong with the payment so the owner knows what to correct."
                  ></textarea>
                </label>
                <small>Minimum 3 characters.</small>
              </div>

              <div v-if="confirmAction" class="confirmation-card" :class="confirmAction">
                <div>
                  <strong>
                    {{ confirmAction === "approve" ? "Approve this payment?" : "Reject this payment?" }}
                  </strong>
                  <span v-if="confirmAction === 'approve'">
                    The payment will be marked as paid and the subscription can be activated.
                  </span>
                  <span v-else>
                    The owner will see the rejection reason and can submit another confirmation.
                  </span>
                </div>

                <div class="confirmation-actions">
                  <button type="button" class="btn btn-small" @click="cancelConfirmation">
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn btn-small"
                    :class="confirmAction === 'approve' ? 'btn-primary' : 'btn-danger'"
                    :disabled="reviewing || (confirmAction === 'reject' && !canReject)"
                    @click="submitReview"
                  >
                    {{
                      reviewing
                        ? "Saving…"
                        : confirmAction === "approve"
                          ? "Yes, approve payment"
                          : "Yes, reject payment"
                    }}
                  </button>
                </div>
              </div>

              <div v-else class="decision-actions">
                <button
                  type="button"
                  class="btn reject-button"
                  :disabled="reviewing"
                  @click="requestReject"
                >
                  <XCircle :size="16" />
                  Reject payment
                </button>

                <button
                  type="button"
                  class="btn btn-primary approve-button"
                  :disabled="reviewing"
                  @click="requestApprove"
                >
                  <CheckCircle2 :size="16" />
                  Approve payment
                </button>
              </div>
            </template>

            <div v-else class="final-status-card">
              <CheckCircle2 v-if="paid" :size="19" />
              <XCircle v-else-if="rejected" :size="19" />
              <Clock3 v-else :size="19" />
              <div>
                <strong>
                  {{ paid ? "Verification completed" : rejected ? "Payment rejected" : "Waiting for submission" }}
                </strong>
                <span>
                  {{
                    paid
                      ? `Paid ${transaction.paid_at ? formatDate(transaction.paid_at) : ""}`
                      : rejected
                        ? "The owner may submit a new payment confirmation."
                        : "No action is available until the owner submits payment."
                  }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.payment-review-backdrop {
  z-index: 90;
  padding: 24px;
}

.payment-review-modal {
  width: min(1040px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
}

.payment-review-header {
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

.payment-review-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 21px;
}

.payment-review-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 11px;
}

.payment-review-body {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  min-height: 620px;
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

.business-summary {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}

.business-summary-icon {
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #134e4a;
  background: #ffffff;
  border-radius: 9px;
}

.business-summary small,
.business-summary span,
.business-summary button {
  display: block;
}

.business-summary small,
.business-summary span {
  color: #ccfbf1;
  font-size: 9px;
}

.business-summary button {
  margin: 3px 0;
  padding: 0;
  color: #ffffff;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  text-align: left;
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
  background: #ffffff;
}

.review-state-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 20px 24px 0;
  padding: 13px 14px;
  border-radius: 12px;
  font-size: 10px;
}

.review-state-banner strong,
.review-state-banner span {
  display: block;
}

.review-state-banner span {
  margin-top: 3px;
  line-height: 1.45;
}

.review-state-banner.success {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.review-state-banner.rejected {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.review-state-banner.waiting {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.review-section {
  padding: 24px;
}

.review-section + .review-section {
  border-top: 1px solid #e2e8f0;
}

.proof-section {
  background: #f8fafc;
}

.decision-section {
  background: #ffffff;
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

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
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

.payment-reference-field {
  background: #fffbeb;
  border-color: #fde68a;
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

.proof-card {
  position: relative;
  min-height: 180px;
  margin-top: 18px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.proof-image {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  background: #f8fafc;
  border-radius: 10px;
}

.proof-placeholder,
.proof-file {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #64748b;
  text-align: center;
}

.proof-placeholder.empty {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}

.proof-placeholder strong,
.proof-file strong {
  color: #334155;
  font-size: 11px;
}

.proof-placeholder small,
.proof-file small {
  max-width: 360px;
  color: #94a3b8;
  font-size: 9px;
  line-height: 1.45;
}

.proof-file {
  flex-direction: row;
  text-align: left;
}

.proof-file-icon {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 12px;
}

.proof-open-button {
  position: absolute;
  right: 24px;
  bottom: 24px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.proof-loader {
  width: 26px;
  height: 26px;
  border: 3px solid #ccfbf1;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.decision-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 18px;
  padding: 11px 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 9px;
  line-height: 1.5;
}

.reject-reason-card {
  margin-top: 12px;
  padding: 13px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 11px;
}

.reject-reason-card label {
  display: grid;
  gap: 7px;
  color: #7f1d1d;
  font-size: 10px;
  font-weight: 750;
}

.reject-reason-card textarea {
  width: 100%;
  resize: vertical;
  padding: 10px 11px;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 9px;
  outline: 0;
  font: inherit;
  font-size: 10px;
  line-height: 1.5;
}

.reject-reason-card textarea:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
}

.reject-reason-card > small {
  display: block;
  margin-top: 6px;
  color: #b91c1c;
  font-size: 8px;
}

.confirmation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 12px;
  padding: 13px 14px;
  border-radius: 11px;
}

.confirmation-card.approve {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.confirmation-card.reject {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.confirmation-card strong,
.confirmation-card span {
  display: block;
}

.confirmation-card strong {
  font-size: 10px;
}

.confirmation-card span {
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.45;
}

.confirmation-actions,
.decision-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirmation-actions {
  flex: 0 0 auto;
}

.decision-actions {
  margin-top: 15px;
}

.confirmation-actions .btn,
.decision-actions .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.reject-button {
  color: #b91c1c;
  background: #ffffff;
  border-color: #fecaca;
}

.reject-button:hover {
  background: #fef2f2;
}

.btn-danger {
  color: #ffffff;
  background: #dc2626;
  border-color: #dc2626;
}

.approve-button {
  min-width: 150px;
}

.final-status-card {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 18px;
  padding: 13px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
}

.final-status-card strong,
.final-status-card span {
  display: block;
}

.final-status-card strong {
  color: #0f172a;
  font-size: 10px;
}

.final-status-card span {
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.45;
}

@media (max-width: 860px) {
  .payment-review-body {
    grid-template-columns: 1fr;
  }

  .payment-summary-panel {
    display: none;
  }
}

@media (max-width: 640px) {
  .payment-review-backdrop {
    padding: 0;
  }

  .payment-review-modal {
    width: 100vw;
    max-height: 100vh;
    min-height: 100vh;
    border-radius: 0;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .confirmation-card,
  .decision-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .confirmation-actions {
    width: 100%;
  }

  .confirmation-actions .btn,
  .decision-actions .btn {
    flex: 1;
  }
}
</style>
