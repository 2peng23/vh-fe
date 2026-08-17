import type { AdminTransaction } from "../../../../types/admin";

// Payment statuses supported by the manual payment verification flow.
export type AdminPaymentStatus =
  | "not_paid"
  | "pending_verification"
  | "paid"
  | "rejected";

// Extend the existing admin transaction while replacing its old
// payment_status type with the statuses used by the new payment flow.
export type ReviewableAdminTransaction = Omit<
  AdminTransaction,
  "payment_status"
> & {
  payment_status: AdminPaymentStatus;

  // Reference number submitted by the owner after making the payment.
  payment_reference?: string | null;

  // Date and time when the owner submitted the payment for verification.
  payment_submitted_at?: string | null;

  // Reason provided by the superadmin when a payment is rejected.
  payment_rejection_reason?: string | null;

  // Private storage path of the uploaded payment proof.
  payment_proof_path?: string | null;
};

// Actions available to the superadmin when reviewing a payment.
export type PaymentReviewAction = "approve" | "reject";

// Payload sent when approving or rejecting a submitted payment.
export type PaymentReviewPayload = {
  action: PaymentReviewAction;
  rejection_reason?: string;
};