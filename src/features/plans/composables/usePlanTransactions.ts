import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { errorMessage } from "../../../api/client";
import { useAuthStore } from "../../../stores/auth";
import type { ApiEnvelope, PaginationMeta } from "../../../types";
import type {
  PaymentMethod,
  PaymentSubmissionPayload,
  PlanOffering,
  PlanTransaction,
  PurchaseForm,
  SelectedOffering,
  SubscriptionPreview,
} from "../types";
import { buildPlanGroups, findRecommendedOffering } from "../utils";

export function usePlanTransactions() {
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();

  const transactions = ref<PlanTransaction[]>([]);
  const selectedTransaction = ref<PlanTransaction | null>(null);
  const paymentTransaction = ref<PlanTransaction | null>(null);
  const paymentQrUrl = ref<string | null>(null);
  const meta = ref<PaginationMeta>();

  const page = ref(1);
  const perPage = ref(20);
  const loading = ref(true);
  const loadingPaymentQr = ref(false);
  const submittingPayment = ref(false);
  const error = ref("");

  const purchaseOpen = ref(false);
  const offerings = ref<PlanOffering[]>([]);
  const paymentMethods = ref<PaymentMethod[]>([]);
  const purchasing = ref(false);
  const preview = ref<SubscriptionPreview | null>(null);
  const loadingPreview = ref(false);

  const purchaseForm = ref<PurchaseForm>({
    subscription_plan_offering_id: "",
    payment_method_id: "",
  });

  const planGroups = computed(() => buildPlanGroups(offerings.value));

  const selectedOffering = computed<SelectedOffering | null>(() => {
    for (const group of planGroups.value) {
      const offering = group.offerings.find(
        (item) =>
          String(item.id) === purchaseForm.value.subscription_plan_offering_id,
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

  const currentSubscription = computed(() => auth.user?.business?.subscription);

  function replaceTransaction(updated: PlanTransaction) {
    const index = transactions.value.findIndex((item) => item.id === updated.id);

    if (index >= 0) {
      transactions.value.splice(index, 1, updated);
    }

    if (selectedTransaction.value?.id === updated.id) {
      selectedTransaction.value = updated;
    }

    if (paymentTransaction.value?.id === updated.id) {
      paymentTransaction.value = updated;
    }
  }

  async function loadTransactions() {
    loading.value = true;
    error.value = "";

    try {
      const { data } = await api.get<ApiEnvelope<PlanTransaction[]>>(
        "/plan-transactions",
        {
          params: {
            page: page.value,
            per_page: perPage.value,
          },
        },
      );

      transactions.value = data.data;
      meta.value = data.meta;

      const linkedTransactionId = Number(route.query.transaction);

      if (
        linkedTransactionId &&
        selectedTransaction.value?.id !== linkedTransactionId
      ) {
        await viewTransaction({ id: linkedTransactionId });
      }

      const linkedPaymentId = Number(route.query.pay);

      if (linkedPaymentId && paymentTransaction.value?.id !== linkedPaymentId) {
        await openPayment({ id: linkedPaymentId } as PlanTransaction);
      }

      if (route.query.purchase === "1" && !purchaseOpen.value) {
        await openPurchase();
      }
    } catch (exception) {
      error.value = errorMessage(exception);
    } finally {
      loading.value = false;
    }
  }

  async function ensurePurchaseOptionsLoaded() {
    if (offerings.value.length && paymentMethods.value.length) return;

    const [plansResponse, methodsResponse] = await Promise.all([
      api.get<ApiEnvelope<PlanOffering[]>>("/plan-offerings"),
      api.get<ApiEnvelope<PaymentMethod[]>>("/payment-methods"),
    ]);

    offerings.value = plansResponse.data.data;
    paymentMethods.value = methodsResponse.data.data;

    const defaultOffering = findRecommendedOffering(
      offerings.value,
      currentSubscription.value?.tier,
    );

    purchaseForm.value = {
      subscription_plan_offering_id: String(defaultOffering?.id ?? ""),
      payment_method_id: String(paymentMethods.value[0]?.id ?? ""),
    };
  }

  async function loadPreview() {
    if (!purchaseForm.value.subscription_plan_offering_id) {
      preview.value = null;
      return;
    }

    loadingPreview.value = true;

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

  async function openPurchase() {
    error.value = "";

    try {
      await ensurePurchaseOptionsLoaded();
      await loadPreview();
      purchaseOpen.value = true;

      if (route.query.purchase !== "1") {
        await router.replace({
          query: {
            ...route.query,
            purchase: "1",
          },
        });
      }
    } catch (exception) {
      error.value = errorMessage(exception);
    }
  }

  async function closePurchase() {
    purchaseOpen.value = false;

    const query = { ...route.query };
    delete query.purchase;

    await router.replace({ query });
  }

  async function purchasePlan() {
    purchasing.value = true;
    error.value = "";

    try {
      const { data } = await api.post<ApiEnvelope<PlanTransaction>>(
        "/plan-transactions",
        purchaseForm.value,
      );

      await closePurchase();
      await loadTransactions();

      // Immediately open the payment flow after creating the transaction.
      if (data?.data?.id) {
        await openPayment(data.data);
      }
    } catch (exception) {
      error.value = errorMessage(exception);
    } finally {
      purchasing.value = false;
    }
  }

  async function viewTransaction(transaction: Pick<PlanTransaction, "id">) {
    error.value = "";

    try {
      const { data } = await api.get<ApiEnvelope<PlanTransaction>>(
        `/plan-transactions/${transaction.id}`,
      );

      selectedTransaction.value = data.data;
    } catch (exception) {
      error.value = errorMessage(exception);
    }
  }

  function closeTransaction() {
    selectedTransaction.value = null;
  }

  async function openPayment(transaction: PlanTransaction) {
    closePaymentQr();
    paymentTransaction.value = transaction;
    error.value = "";

    try {
      // Fetch the latest transaction so the modal always shows current status/details.
      const { data } = await api.get<ApiEnvelope<PlanTransaction>>(
        `/plan-transactions/${transaction.id}`,
      );

      paymentTransaction.value = data.data;
      replaceTransaction(data.data);

      if (data.data.selected_payment_method?.qr_path) {
        await loadPaymentQr(data.data.id);
      }
    } catch (exception) {
      error.value = errorMessage(exception);
    }
  }

  async function loadPaymentQr(transactionId: number) {
    loadingPaymentQr.value = true;
    closePaymentQr();

    try {
      const response = await api.get(
        `/plan-transactions/${transactionId}/payment-qr`,
        { responseType: "blob" },
      );

      paymentQrUrl.value = URL.createObjectURL(response.data);
    } catch (exception) {
      // Keep the modal usable even when there is no QR. Account details remain visible.
      paymentQrUrl.value = null;
      error.value = errorMessage(exception);
    } finally {
      loadingPaymentQr.value = false;
    }
  }

  function closePaymentQr() {
    if (paymentQrUrl.value) {
      URL.revokeObjectURL(paymentQrUrl.value);
    }

    paymentQrUrl.value = null;
  }

  function closePayment() {
    closePaymentQr();
    paymentTransaction.value = null;
  }

  async function submitPayment(payload: PaymentSubmissionPayload) {
    if (!paymentTransaction.value) return;

    submittingPayment.value = true;
    error.value = "";

    try {
      const form = new FormData();

      if (payload.payment_reference) {
        form.append("payment_reference", payload.payment_reference);
      }

      if (payload.proof) {
        form.append("proof", payload.proof);
      }

      const { data } = await api.post<ApiEnvelope<PlanTransaction>>(
        `/plan-transactions/${paymentTransaction.value.id}/submit-payment`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      replaceTransaction(data.data);
    } catch (exception) {
      error.value = errorMessage(exception);
    } finally {
      submittingPayment.value = false;
    }
  }

  onMounted(loadTransactions);
  onBeforeUnmount(closePaymentQr);

  watch(page, loadTransactions);

  watch(
    () => purchaseForm.value.subscription_plan_offering_id,
    () => {
      if (purchaseOpen.value) {
        void loadPreview();
      }
    },
  );

  watch(perPage, () => {
    if (page.value !== 1) {
      page.value = 1;
      return;
    }

    void loadTransactions();
  });

  return {
    transactions,
    selectedTransaction,
    paymentTransaction,
    paymentQrUrl,
    meta,
    page,
    perPage,
    loading,
    loadingPaymentQr,
    submittingPayment,
    error,
    purchaseOpen,
    paymentMethods,
    purchasing,
    preview,
    loadingPreview,
    currentSubscription,
    purchaseForm,
    planGroups,
    selectedOffering,
    selectedPaymentMethod,
    loadTransactions,
    openPurchase,
    closePurchase,
    purchasePlan,
    viewTransaction,
    closeTransaction,
    openPayment,
    closePayment,
    submitPayment,
  };
}
