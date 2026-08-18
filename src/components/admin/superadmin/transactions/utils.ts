import type { ReviewableAdminTransaction } from "./types";
import { formatCurrency } from "../../../../utils";

export function formatAdminTransactionCurrency(
  value: number | string,
): string {
  return formatCurrency(value);
}

// Check whether the payment has already been verified and paid.
export function isPaymentPaid(
  transaction: ReviewableAdminTransaction,
): boolean {
  return transaction.payment_status === "paid";
}

// Check whether the owner's payment is waiting for superadmin verification.
export function isPaymentPending(
  transaction: ReviewableAdminTransaction,
): boolean {
  return transaction.payment_status === "pending_verification";
}

// Check whether the payment was rejected by the superadmin.
export function isPaymentRejected(
  transaction: ReviewableAdminTransaction,
): boolean {
  return transaction.payment_status === "rejected";
}

// Return the user-friendly label displayed by the payment status badge.
export function paymentStatusLabel(
  transaction: ReviewableAdminTransaction,
): string {
  if (isPaymentPaid(transaction)) {
    return "Paid";
  }

  if (isPaymentPending(transaction)) {
    return "Pending verification";
  }

  if (isPaymentRejected(transaction)) {
    return "Payment rejected";
  }

  return "Payment required";
}
