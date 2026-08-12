<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  Building2,
  CarFront,
  ChevronDown,
  ChevronRight,
  LogOut,
  Pencil,
  Plus,
  MessageCircle,
  CreditCard,
  Copy,
  LayoutDashboard,
  Menu,
  QrCode,
  Trash2,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import api, { errorMessage, validationErrors } from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ApiEnvelope, PaginationMeta } from "../types";
import AppLogo from "../components/AppLogo.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal.vue";
import AdminSupportPanel from "../components/support/AdminSupportPanel.vue";
import BusinessTable from "../components/admin/BusinessTable.vue";
import { formatDate } from "../utils/date";
import type { SupportConversation, SupportMessage, SupportTemplate } from "../types/support";

type AdminTab = "dashboard" | "businesses" | "users" | "permissions" | "support" | "transactions" | "payment-methods" | "plans";

const auth = useAuthStore(),
  router = useRouter(),
  tab = ref<AdminTab>("dashboard"),
  stats = ref<any>({}),
  rows = ref<any[]>([]),
  meta = ref<PaginationMeta>(),
  loading = ref(true),
  error = ref(""),
  search = ref(""),
  page = ref(1),
  perPage = ref(20),
  editing = ref<any | null>(null),
  creatingOwner = ref(false),
  saving = ref(false),
  createErrors = ref<Record<string, string[]>>({}),
  permissionData = ref<any>({ modules: {} }),
  selectedPermissionUserId = ref<number | null>(null),
  selectedPermissionUser = ref<any | null>(null),
  permissionUserOptions = ref<any[]>([]),
  permissionUserTotal = ref(0),
  permissionUserSearch = ref(""),
  permissionUserPickerOpen = ref(false),
  permissionUserSearchLoading = ref(false),
  selectedPermissions = ref<string[]>([]),
  bulkRole = ref<"owner" | "staff">("owner"),
  bulkConfirmOpen = ref(false),
  bulkSaving = ref(false),
  impersonatingUserId = ref<number | null>(null),
  expandedOwners = ref<Set<number>>(new Set());
const adminSidebarOpen = ref(false);
const adminNavigation: Array<{ id: AdminTab; label: string; icon: any }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "users", label: "All users", icon: Users },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "plans", label: "Plans", icon: ShieldCheck },
  { id: "payment-methods", label: "Payment methods", icon: QrCode },
  { id: "support", label: "Support", icon: MessageCircle },
];
const adminPage = computed(() => ({
  dashboard: { title: "Dashboard", description: "Monitor businesses, plans, users, and vehicles across the platform." },
  businesses: { title: "Businesses", description: "Manage tenant businesses, plans, limits, and account access." },
  users: { title: "Users", description: "Review and manage owners and staff across every business." },
  permissions: { title: "Permissions", description: "Configure access for individual tenant users." },
  transactions: { title: "Transactions", description: "Track plan purchases and payment processing." },
  plans: { title: "Plans", description: "Configure plan prices, billing periods, limits, and details." },
  "payment-methods": { title: "Payment methods", description: "Manage the accounts available for plan payments." },
  support: { title: "Support", description: "Read and respond to business support conversations." },
})[tab.value]);
const transactionModalOpen = ref(false);
const selectedAdminTransaction = ref<any | null>(null);
const transactionBusinesses = ref<any[]>([]);
const transactionErrors = ref<Record<string, string[]>>({});
const transactionForm = reactive({
  business_id: "",
  plan: "starter",
  amount: "",
  payment_method_id: "",
  paid_at: todayInManila(),
  starts_at: todayInManila(),
  ends_at: "",
  notes: "",
});
const transactionPaymentMethods = ref<any[]>([]);
const transactionFilters = reactive({
  plan: "",
  payment_status: "",
  status: "",
  payment_method: "",
  date_from: "",
  date_to: "",
});
const transactionFiltersActive = computed(() => Boolean(
  search.value.trim() || Object.values(transactionFilters).some((value) => value),
));
const updatingTransactionId = ref<number | null>(null);
const copiedTransactionId = ref<number | null>(null);
const transactionCurrency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const paymentMethodModalOpen = ref(false);
const planOfferingModalOpen = ref(false), editingPlanOffering = ref<any | null>(null), planOfferingErrors = ref<Record<string, string[]>>({});
const planOfferingForm = reactive({ plan: "starter", name: "Starter", duration_months: 1, price: "", vehicle_limit: 5, details: "", is_active: true });
const editingPaymentMethod = ref<any | null>(null);
const deletingPaymentMethod = ref<any | null>(null);
const paymentMethodQr = ref<File | null>(null);
const paymentMethodErrors = ref<Record<string, string[]>>({});
const paymentMethodForm = reactive({ name: "", account_name: "", account_number: "", remove_qr: false });
const qrPreview = ref<{ name: string; url: string } | null>(null);
const supportConversations = ref<SupportConversation[]>([]);
const selectedSupportBusiness = ref<SupportConversation | null>(null);
const supportMessages = ref<SupportMessage[]>([]);
const supportReply = ref("");
const supportTemplates = ref<SupportTemplate[]>([]);
const templateModalOpen = ref(false);
const editingTemplate = ref<SupportTemplate | null>(null);
const templateSaving = ref(false);
const templateErrors = ref<Record<string, string[]>>({});
const templateForm = reactive({ title: "", message: "" });
const supportAttachment = ref<File | null>(null);
const supportPanel = ref<InstanceType<typeof AdminSupportPanel>>();
const supportHasMore = ref(false);
const supportLoadingOlder = ref(false);
const supportUnreadTotal = computed(() => supportConversations.value.reduce(
  (total, business) => total + Number(business.unread_support_count || 0), 0,
));
async function scrollSupportToBottom() {
  await nextTick();
  await supportPanel.value?.scrollToBottom();
}
const form = reactive<Record<string, any>>({});
const ownerForm = reactive({
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  subscription_plan: "trial",
  subscription_status: "active",
  vehicle_limit_override: "",
  plan_ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
});
function todayInManila() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function statusFromPlanEnd(value: string) {
  return value && value < todayInManila() ? "past_due" : "active";
}
watch(() => ownerForm.plan_ends_at, (value) => {
  ownerForm.subscription_status = statusFromPlanEnd(value);
});
watch(() => form.plan_ends_at, (value) => {
  if (editing.value && tab.value === "businesses") form.subscription_status = statusFromPlanEnd(value || "");
});
async function loadStats() {
  const { data } = await api.get<ApiEnvelope<any>>("/superadmin/dashboard");
  stats.value = data.data;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    if (tab.value === "dashboard") {
      rows.value = [];
      meta.value = undefined;
      return;
    }
    if (tab.value === "support") {
      await loadSupportConversations();
      rows.value = [];
      meta.value = undefined;
      return;
    }
    if (tab.value === "permissions") {
      const { data } = await api.get<ApiEnvelope<any>>("/superadmin/permissions");
      permissionData.value = data.data;
      if (selectedPermissionUserId.value) {
        await loadPermissionUser(selectedPermissionUserId.value);
      } else {
        await searchPermissionUsers(true);
      }
      rows.value = [];
      meta.value = undefined;
      return;
    }
    if (tab.value === "payment-methods") {
      const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/payment-methods");
      rows.value = data.data;
      meta.value = undefined;
      return;
    }
    if (tab.value === "plans") {
      const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/plan-offerings");
      rows.value = data.data;
      meta.value = undefined;
      return;
    }
    if (tab.value === "transactions" && !transactionPaymentMethods.value.length) {
      const { data: methods } = await api.get<ApiEnvelope<any[]>>("/superadmin/payment-methods");
      transactionPaymentMethods.value = methods.data;
    }
    const { data } = await api.get<ApiEnvelope<any[]>>(
      `/superadmin/${tab.value}`,
      {
        params: {
          search: search.value,
          ...(tab.value === "transactions" ? transactionFilters : {}),
          page: page.value,
          per_page: perPage.value,
        },
      },
    );
    rows.value = data.data;
    if (tab.value === "users") {
      expandedOwners.value = search.value.trim()
        ? new Set(data.data.map((owner: any) => owner.id))
        : new Set();
    }
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

/** Apply transaction filters from the first page so pagination remains consistent. */
function applyTransactionFilters() {
  page.value = 1;
  load();
}

/** Clear every transaction filter and restore the complete transaction history. */
function clearTransactionFilters() {
  search.value = "";
  Object.assign(transactionFilters, {
    plan: "",
    payment_status: "",
    status: "",
    payment_method: "",
    date_from: "",
    date_to: "",
  });
  applyTransactionFilters();
}
function selectTab(value: AdminTab) {
  if (value === "support" && tab.value !== "support") {
    selectedSupportBusiness.value = null;
    supportMessages.value = [];
    supportReply.value = "";
  }
  tab.value = value;
  adminSidebarOpen.value = false;
  page.value = 1;
  load();
}

/** Open a blank or populated configurable plan offering form. */
function openPlanOffering(offering: any | null = null) {
  editingPlanOffering.value = offering;
  planOfferingErrors.value = {};
  Object.assign(planOfferingForm, offering || { plan: "starter", name: "Starter", duration_months: 1, price: "", vehicle_limit: 5, details: "", is_active: true });
  planOfferingModalOpen.value = true;
}

/** Save a plan offering used by owner self-service purchases. */
async function savePlanOffering() {
  saving.value = true;
  try {
    if (editingPlanOffering.value) await api.put(`/superadmin/plan-offerings/${editingPlanOffering.value.id}`, planOfferingForm);
    else await api.post("/superadmin/plan-offerings", planOfferingForm);
    planOfferingModalOpen.value = false;
    await load();
  } catch (e) { error.value = errorMessage(e); planOfferingErrors.value = validationErrors(e); } finally { saving.value = false; }
}

/** Open a blank payment method form. */
function addPaymentMethod() {
  editingPaymentMethod.value = null;
  paymentMethodErrors.value = {};
  paymentMethodQr.value = null;
  Object.assign(paymentMethodForm, { name: "", account_name: "", account_number: "", remove_qr: false });
  paymentMethodModalOpen.value = true;
}

/** Open an existing payment method for editing. */
function editPaymentMethod(method: any) {
  editingPaymentMethod.value = method;
  paymentMethodErrors.value = {};
  paymentMethodQr.value = null;
  Object.assign(paymentMethodForm, { name: method.name, account_name: method.account_name, account_number: method.account_number, remove_qr: false });
  paymentMethodModalOpen.value = true;
}

/** Retain the optional QR image selected in the payment method form. */
function choosePaymentQr(event: Event) {
  paymentMethodQr.value = (event.target as HTMLInputElement).files?.[0] || null;
}

/** Create or update a payment method using multipart form data. */
async function savePaymentMethod() {
  saving.value = true;
  paymentMethodErrors.value = {};
  error.value = "";
  try {
    const payload = new FormData();
    payload.append("name", paymentMethodForm.name);
    payload.append("account_name", paymentMethodForm.account_name);
    payload.append("account_number", paymentMethodForm.account_number);
    if (paymentMethodQr.value) payload.append("qr", paymentMethodQr.value);
    if (paymentMethodForm.remove_qr) payload.append("remove_qr", "1");
    if (editingPaymentMethod.value) payload.append("_method", "PUT");
    const path = editingPaymentMethod.value ? `/superadmin/payment-methods/${editingPaymentMethod.value.id}` : "/superadmin/payment-methods";
    await api.post(path, payload);
    paymentMethodModalOpen.value = false;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
    paymentMethodErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}

/** Delete the selected payment method after confirmation. */
async function deletePaymentMethod() {
  if (!deletingPaymentMethod.value) return;
  saving.value = true;
  try {
    await api.delete(`/superadmin/payment-methods/${deletingPaymentMethod.value.id}`);
    deletingPaymentMethod.value = null;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

/** Load an authenticated QR image and display it in the in-page preview modal. */
async function viewPaymentQr(method: any) {
  const response = await api.get(`/superadmin/payment-methods/${method.id}/qr`, { responseType: "blob" });
  closeQrPreview();
  qrPreview.value = { name: method.name, url: URL.createObjectURL(response.data) };
}

/** Close the QR preview and release its temporary browser URL. */
function closeQrPreview() {
  if (qrPreview.value?.url) URL.revokeObjectURL(qrPreview.value.url);
  qrPreview.value = null;
}

/** Persist a transaction status and refresh business totals after completion. */
async function updateTransactionStatus(transaction: any, status: string) {
  updatingTransactionId.value = transaction.id;
  error.value = "";
  try {
    await api.put(`/superadmin/transactions/${transaction.id}/status`, { status });
    transaction.status = status;
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    updatingTransactionId.value = null;
  }
}

/** Open the complete transaction record from the compact transaction table. */
function viewTransactionInformation(transaction: any) {
  selectedAdminTransaction.value = transaction;
}

/** Copy the authenticated owner URL for opening a specific transaction. */
async function copyTransactionLink(transaction: any) {
  const url = `${window.location.origin}/plan-transactions?transaction=${transaction.id}`;
  await navigator.clipboard.writeText(url);
  copiedTransactionId.value = transaction.id;
  window.setTimeout(() => {
    if (copiedTransactionId.value === transaction.id) copiedTransactionId.value = null;
  }, 2000);
}

/** Create a ledger entry and apply its purchased plan period to the business. */
async function createTransaction() {
  saving.value = true;
  transactionErrors.value = {};
  error.value = "";
  try {
    await api.post("/superadmin/transactions", transactionForm);
    transactionModalOpen.value = false;
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    error.value = errorMessage(e);
    transactionErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}
async function loadSupportConversations() {
  const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/support/conversations");
  supportConversations.value = data.data;
  const selected = selectedSupportBusiness.value;
  if (selected) {
    const refreshed = data.data.find((item: SupportConversation) => supportConversationKey(item) === supportConversationKey(selected));
    if (refreshed) selectedSupportBusiness.value = refreshed;
  }
}
/** Build a collision-safe identifier for business and guest conversations. */
function supportConversationKey(item: SupportConversation): string {
  return `${item.conversation_type || "business"}-${item.id}`;
}
/** Resolve the API thread endpoint for either conversation type. */
function supportConversationPath(item: SupportConversation): string {
  return `/superadmin/support/${item.conversation_type === "guest" ? "guests" : "businesses"}/${item.id}`;
}
async function loadSupportTemplates() {
  const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/support/templates");
  supportTemplates.value = data.data;
}
async function createSupportTemplate() {
  templateSaving.value = true;
  templateErrors.value = {};
  try {
    const { data } = editingTemplate.value
      ? await api.put(`/superadmin/support/templates/${editingTemplate.value.id}`, templateForm)
      : await api.post("/superadmin/support/templates", templateForm);
    const existingIndex = supportTemplates.value.findIndex((template) => template.id === data.data.id);
    if (existingIndex >= 0) supportTemplates.value.splice(existingIndex, 1, data.data);
    else supportTemplates.value.push(data.data);
    supportTemplates.value.sort((a, b) => a.title.localeCompare(b.title));
    templateModalOpen.value = false;
    editingTemplate.value = null;
    templateForm.title = "";
    templateForm.message = "";
  } catch (e) {
    templateErrors.value = validationErrors(e);
    error.value = errorMessage(e);
  } finally {
    templateSaving.value = false;
  }
}
/** Open the reusable template editor with existing values. */
function editSupportTemplate(template: SupportTemplate) {
  editingTemplate.value = template;
  templateErrors.value = {};
  templateForm.title = template.title;
  templateForm.message = template.message;
  templateModalOpen.value = true;
}
/** Reset the template form before creating a reusable reply. */
function addSupportTemplate() {
  editingTemplate.value = null;
  templateErrors.value = {};
  templateForm.title = "";
  templateForm.message = "";
  templateModalOpen.value = true;
}
async function selectSupportBusiness(business: any) {
  selectedSupportBusiness.value = business;
  const { data } = await api.get<ApiEnvelope<any[]>>(supportConversationPath(business));
  supportMessages.value = data.data;
  supportHasMore.value = (data.meta as any)?.has_more || false;
  business.unread_support_count = 0;
  await scrollSupportToBottom();
}
async function openBusinessSupport(business: any) {
  error.value = "";
  tab.value = "support";
  rows.value = [];
  meta.value = undefined;
  await loadSupportConversations();
  const conversation = supportConversations.value.find(
    (item: any) => item.conversation_type !== "guest" && item.id === business.id,
  ) || { ...business, conversation_type: "business", unread_support_count: 0 };
  await selectSupportBusiness(conversation);
}
async function viewSupportBusiness(business: any) {
  if (business.conversation_type === "guest") return;
  await viewBusiness(business);
}

/** Open the Businesses tab and narrow the table to the selected business. */
async function viewBusiness(business: any) {
  if (!business?.name) return;
  search.value = business.name;
  page.value = 1;
  selectedSupportBusiness.value = null;
  supportMessages.value = [];
  tab.value = "businesses";
  await load();
}
async function loadOlderSupportMessages() {
  if (supportLoadingOlder.value || !supportHasMore.value || !supportMessages.value.length || !selectedSupportBusiness.value) return;
  supportLoadingOlder.value = true;
  const element = supportPanel.value?.threadElement();
  const previousHeight = element?.scrollHeight || 0;
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>(supportConversationPath(selectedSupportBusiness.value), {
      params: { before_id: supportMessages.value[0].id },
    });
    supportMessages.value = [...data.data, ...supportMessages.value];
    supportHasMore.value = (data.meta as any)?.has_more || false;
    await nextTick();
    if (element) element.scrollTop += element.scrollHeight - previousHeight;
  } finally {
    supportLoadingOlder.value = false;
  }
}
let supportRefreshTimer: number;
let supportRefreshing = false;
async function refreshSupport() {
  if (supportRefreshing) return;
  supportRefreshing = true;
  try {
    await loadSupportConversations();
    if (tab.value === "support" && selectedSupportBusiness.value) {
      const previousLastId = supportMessages.value.at(-1)?.id;
      const { data } = await api.get<ApiEnvelope<any[]>>(supportConversationPath(selectedSupportBusiness.value));
      const nextLastId = data.data.at(-1)?.id;
      const merged = new Map(supportMessages.value.map((item) => [item.id, item]));
      data.data.forEach((item: any) => merged.set(item.id, item));
      supportMessages.value = [...merged.values()].sort((a, b) => a.id - b.id);
      if (previousLastId !== nextLastId) await scrollSupportToBottom();
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    supportRefreshing = false;
  }
}
async function sendSupportReply() {
  const text = supportReply.value.trim();
  if ((!text && !supportAttachment.value) || !selectedSupportBusiness.value) return;
  saving.value = true;
  try {
    const payload = new FormData();
    if (text) payload.append("message", text);
    if (supportAttachment.value) payload.append("attachment", supportAttachment.value);
    const { data } = await api.post(supportConversationPath(selectedSupportBusiness.value), payload);
    supportMessages.value.push(data.data);
    supportReply.value = "";
    supportAttachment.value = null;
    await scrollSupportToBottom();
    await loadSupportConversations();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
function chooseSupportAttachment(event: Event) {
  supportAttachment.value = (event.target as HTMLInputElement).files?.[0] || null;
}
function applySupportTemplate(message: string) {
  supportReply.value = message.replace("{{dashboard_url}}", `${window.location.origin}/`);
}
async function downloadSupportAttachment(item: any) {
  const response = await api.get(`/support/attachments/${item.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.attachment_name;
  link.click();
  URL.revokeObjectURL(url);
}
function selectPermissionUser(user: any) {
  selectedPermissionUserId.value = user.id;
  selectedPermissionUser.value = user;
  selectedPermissions.value = [...(user?.permissions || [])];
  if (user?.role === "owner" || user?.role === "staff") bulkRole.value = user.role;
  permissionUserPickerOpen.value = false;
  permissionUserSearch.value = "";
}
async function loadPermissionUser(userId: number) {
  const { data } = await api.get<ApiEnvelope<any>>(`/superadmin/permissions/users/${userId}`);
  selectPermissionUser(data.data);
}
async function searchPermissionUsers(selectFirst = false) {
  permissionUserSearchLoading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/permissions/users", {
      params: { search: permissionUserSearch.value.trim(), per_page: 20 },
    });
    permissionUserOptions.value = data.data;
    permissionUserTotal.value = data.meta?.total || data.data.length;
    if (selectFirst && !selectedPermissionUserId.value && data.data[0]) {
      selectPermissionUser(data.data[0]);
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    permissionUserSearchLoading.value = false;
  }
}
let permissionUserSearchTimer: number;
function queuePermissionUserSearch() {
  clearTimeout(permissionUserSearchTimer);
  permissionUserSearchTimer = window.setTimeout(() => searchPermissionUsers(), 250);
}
function openPermissionUserPicker() {
  permissionUserPickerOpen.value = !permissionUserPickerOpen.value;
  if (permissionUserPickerOpen.value) searchPermissionUsers();
}
function openUserPermissions(userId: number) {
  selectedPermissionUserId.value = userId;
  tab.value = "permissions";
  page.value = 1;
  load();
}
async function openUserDashboard(userId: number) {
  impersonatingUserId.value = userId;
  error.value = "";
  try {
    await auth.impersonate(userId);
    await router.push("/");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    impersonatingUserId.value = null;
  }
}
async function applyPermissionsToAll() {
  bulkSaving.value = true;
  error.value = "";
  try {
    await api.put("/superadmin/permissions/apply-to-role", {
      role: bulkRole.value,
      permissions: selectedPermissions.value,
    });
    bulkConfirmOpen.value = false;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    bulkSaving.value = false;
  }
}
function toggleOwner(ownerId: number) {
  const next = new Set(expandedOwners.value);
  next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId);
  expandedOwners.value = next;
}
function visibleStaff(owner: any) {
  const staff = owner.business?.users || [];
  const term = search.value.trim().toLowerCase();
  if (!term) return staff;
  return staff.filter((user: any) =>
    [user.name, user.email].some((value) =>
      String(value || "").toLowerCase().includes(term),
    ),
  );
}
async function savePermissions() {
  if (!selectedPermissionUserId.value) return;
  saving.value = true;
  error.value = "";
  try {
    await api.put(`/superadmin/permissions/users/${selectedPermissionUserId.value}`, { permissions: selectedPermissions.value });
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
function edit(row: any) {
  editing.value = row;
  Object.keys(form).forEach((key) => delete form[key]);
  if (tab.value === "businesses")
    Object.assign(form, {
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      subscription_status: row.subscription_status,
      status: row.status || "active",
      plan_ends_at: row.plan_ends_at?.slice(0, 10) || "",
      vehicle_limit_override: row.vehicle_limit_override ?? "",
    });
  else
    Object.assign(form, {
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      password: "",
      password_confirmation: "",
      vehicle_limit_override: row.role === "owner" ? (row.business?.vehicle_limit_override ?? "") : undefined,
    });
}
async function save() {
  if (!editing.value) return;
  saving.value = true;
  error.value = "";
  const payload = { ...form };
  if (!payload.password) {
    delete payload.password;
    delete payload.password_confirmation;
  }
  try {
    await api.put(`/superadmin/${tab.value}/${editing.value.id}`, payload);
    editing.value = null;
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}
function openCreateOwner() {
  createErrors.value = {};
  error.value = "";
  creatingOwner.value = true;
}
async function createOwner() {
  saving.value = true;
  error.value = "";
  createErrors.value = {};
  try {
    const payload: Record<string, any> = { ...ownerForm };
    await api.post("/superadmin/owners", payload);
    creatingOwner.value = false;
    Object.assign(ownerForm, {
      business_name: "",
      owner_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
      subscription_plan: "trial",
      subscription_status: "active",
      vehicle_limit_override: "",
      plan_ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    error.value = errorMessage(e);
    createErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}
async function logout() {
  await auth.logout();
  router.push("/login");
}
onMounted(async () => {
  try {
    await Promise.all([loadStats(), load(), loadSupportConversations(), loadSupportTemplates()]);
  } catch (e) {
    error.value = errorMessage(e);
  }
  supportRefreshTimer = window.setInterval(refreshSupport, 2000);
});
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
onBeforeUnmount(() => {
  clearTimeout(permissionUserSearchTimer);
  clearInterval(supportRefreshTimer);
  closeQrPreview();
});
</script>
<template>
  <div class="superadmin-shell">
    <aside class="superadmin-sidebar" :class="{ open: adminSidebarOpen }">
      <div class="superadmin-sidebar-brand">
        <AppLogo />
        <button class="icon-btn superadmin-sidebar-close" aria-label="Close navigation" @click="adminSidebarOpen = false"><X /></button>
      </div>
      <nav class="superadmin-navigation" aria-label="Super administrator navigation">
        <small>Platform</small>
        <button
          v-for="item in adminNavigation"
          :key="item.id"
          type="button"
          :class="{ active: tab === item.id }"
          @click="selectTab(item.id)"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
          <em v-if="item.id === 'support' && supportUnreadTotal" class="superadmin-nav-count">{{ supportUnreadTotal > 99 ? '99+' : supportUnreadTotal }}</em>
        </button>
      </nav>
      <div class="superadmin-sidebar-account">
        <span><ShieldCheck /> Platform administration</span>
        <strong>{{ auth.user?.name }}</strong>
        <button type="button" @click="logout"><LogOut /> Sign out</button>
      </div>
    </aside>
    <button v-if="adminSidebarOpen" class="superadmin-sidebar-overlay" aria-label="Close navigation" @click="adminSidebarOpen = false"></button>
    <section class="superadmin-workspace">
      <header class="superadmin-topbar">
        <button class="icon-btn superadmin-menu-button" aria-label="Open navigation" @click="adminSidebarOpen = true"><Menu /></button>
        <div>
          <small>Vehicle Hub Control Center</small>
          <strong>{{ adminPage.title }}</strong>
        </div>
        <div class="superadmin-topbar-account">
          <span>{{ auth.user?.name }}</span>
          <button class="btn" @click="logout"><LogOut />Sign out</button>
        </div>
      </header>
      <main class="superadmin-content">
      <div class="superadmin-heading">
        <div>
          <span class="eyebrow">PLATFORM ADMINISTRATION</span>
          <h1>{{ adminPage.title }}</h1>
          <p>{{ adminPage.description }}</p>
        </div>
        <button v-if="tab === 'businesses'" class="btn btn-primary" @click="openCreateOwner">
          <Plus /> Add business
        </button>
      </div>
      <div v-if="tab === 'dashboard'" class="superadmin-stats">
        <article>
          <Building2 /><small>Businesses</small
          ><strong>{{ stats.businesses || 0 }}</strong>
        </article>
        <article>
          <ShieldCheck /><small>Active / Trial plans</small
          ><strong
            >{{ stats.active_businesses || 0 }} /
            {{ stats.trial_businesses || 0 }}</strong
          >
        </article>
        <article>
          <Users /><small>Tenant users</small
          ><strong>{{ stats.users || 0 }}</strong>
        </article>
        <article>
          <CarFront /><small>Vehicle vehicles</small
          ><strong>{{ stats.vehicles || 0 }}</strong>
        </article>
      </div>
      <div v-if="tab === 'dashboard'" class="superadmin-dashboard-grid">
        <section class="card superadmin-quick-actions">
          <div><span class="eyebrow">QUICK ACCESS</span><h2>Manage the platform</h2><p>Open a workspace to review and update platform records.</p></div>
          <div class="superadmin-quick-links">
            <button v-for="item in adminNavigation.filter((item) => item.id !== 'dashboard')" :key="item.id" type="button" @click="selectTab(item.id)">
              <span><component :is="item.icon" /><strong>{{ item.label }}</strong></span><ChevronRight />
            </button>
          </div>
        </section>
        <section class="card superadmin-plan-summary">
          <span class="eyebrow">ACCOUNT SUMMARY</span>
          <h2>Business plans</h2>
          <div><span>Active businesses</span><strong>{{ stats.active_businesses || 0 }}</strong></div>
          <div><span>Trial plans</span><strong>{{ stats.trial_businesses || 0 }}</strong></div>
          <div><span>Total businesses</span><strong>{{ stats.businesses || 0 }}</strong></div>
          <button class="btn" type="button" @click="selectTab('businesses')">View all businesses</button>
        </section>
      </div>
      <div v-else class="superadmin-panel card">
        <div class="superadmin-toolbar">
          <div><strong>{{ adminPage.title }}</strong><small>{{ meta?.total ?? rows.length }} records</small></div>
          <div v-if="tab !== 'permissions' && tab !== 'support' && tab !== 'payment-methods' && tab !== 'transactions'" class="superadmin-search">
            <input
              v-model="search"
              :placeholder="`Search ${tab}`"
              @keyup.enter="
                page = 1;
                load();
              "
            /><button
              class="btn btn-primary"
              @click="
                page = 1;
                load();
              "
            >
              Search
            </button>
          </div>
          <button v-if="tab === 'payment-methods'" class="btn btn-primary" @click="addPaymentMethod"><Plus />Add payment method</button>
          <button v-if="tab === 'plans'" class="btn btn-primary" @click="openPlanOffering()"><Plus />Add plan</button>
        </div>
        <form v-if="tab === 'transactions'" class="transaction-filters" @submit.prevent="applyTransactionFilters">
          <label class="transaction-filter-search">
            Search
            <div><Search /><input v-model="search" placeholder="Business, email, reference or plan" /></div>
          </label>
          <label>
            Plan
            <select v-model="transactionFilters.plan">
              <option value="">All plans</option>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label>
            Payment
            <select v-model="transactionFilters.payment_status">
              <option value="">All payment statuses</option>
              <option value="paid">Paid</option>
              <option value="not_paid">Not paid</option>
            </select>
          </label>
          <label>
            Transaction
            <select v-model="transactionFilters.status">
              <option value="">All transaction statuses</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label>
            Payment method
            <select v-model="transactionFilters.payment_method">
              <option value="">All methods</option>
              <option v-for="method in transactionPaymentMethods" :key="method.id" :value="method.name">{{ method.name }}</option>
            </select>
          </label>
          <label>
            From
            <input v-model="transactionFilters.date_from" type="date" :max="transactionFilters.date_to || undefined" />
          </label>
          <label>
            To
            <input v-model="transactionFilters.date_to" type="date" :min="transactionFilters.date_from || undefined" />
          </label>
          <button class="btn btn-primary" type="submit"><Search /> Apply filters</button>
          <button class="btn" type="button" :disabled="!transactionFiltersActive" @click="clearTransactionFilters"><X /> Clear</button>
        </form>
        <div v-if="error" class="alert error">{{ error }}</div>
        <LoadingState v-if="loading" />
        <AdminSupportPanel
          v-else-if="tab === 'support'"
          ref="supportPanel"
          v-model:reply="supportReply"
          :conversations="supportConversations"
          :selected="selectedSupportBusiness"
          :messages="supportMessages"
          :templates="supportTemplates"
          :attachment="supportAttachment"
          :saving="saving"
          :loading-older="supportLoadingOlder"
          @select="selectSupportBusiness"
          @view-business="viewSupportBusiness"
          @load-older="loadOlderSupportMessages"
          @send="sendSupportReply"
          @download="downloadSupportAttachment"
          @choose-attachment="chooseSupportAttachment"
          @clear-attachment="supportAttachment = null"
          @use-template="applySupportTemplate"
          @add-template="addSupportTemplate"
          @edit-template="editSupportTemplate"
        />
        <div v-else-if="tab === 'permissions'" class="permission-editor">
          <div class="toolbar permission-toolbar">
            <div class="permission-user-field">
              <label>User</label>
              <div class="permission-user-picker">
                <button
                  type="button"
                  class="permission-user-trigger"
                  :aria-expanded="permissionUserPickerOpen"
                  @click="openPermissionUserPicker"
                >
                  <span v-if="selectedPermissionUser">
                    <strong>{{ selectedPermissionUser.name }}</strong>
                    <small>{{ selectedPermissionUser.email }} · {{ selectedPermissionUser.business?.name || 'No business' }} · {{ selectedPermissionUser.role }}</small>
                  </span>
                  <span v-else>Select a user</span>
                  <ChevronDown />
                </button>
                <div v-if="permissionUserPickerOpen" class="permission-user-dropdown">
                  <div class="permission-user-search">
                    <Search /><input
                      v-model="permissionUserSearch"
                      autofocus
                      placeholder="Search name, email, business or role"
                      @input="queuePermissionUserSearch"
                      @keydown.escape="permissionUserPickerOpen = false"
                    />
                  </div>
                  <p v-if="permissionUserSearchLoading" class="permission-user-state">Searching users…</p>
                  <div v-else-if="permissionUserOptions.length" class="permission-user-options">
                    <button
                      v-for="user in permissionUserOptions"
                      :key="user.id"
                      type="button"
                      :class="{ selected: user.id === selectedPermissionUserId }"
                      @click="selectPermissionUser(user)"
                    >
                      <strong>{{ user.name }}</strong>
                      <small>{{ user.email }} · {{ user.business?.name || 'No business' }} · {{ user.role }}</small>
                    </button>
                  </div>
                  <p v-else class="permission-user-state">No matching users found.</p>
                  <small v-if="permissionUserTotal > permissionUserOptions.length" class="permission-user-hint">Showing {{ permissionUserOptions.length }} of {{ permissionUserTotal }} users. Type to narrow the results.</small>
                </div>
              </div>
            </div>
            <button class="btn btn-primary" :disabled="saving || !selectedPermissionUserId" @click="savePermissions">
              {{ saving ? 'Saving…' : 'Save permissions' }}
            </button>
            <div class="permission-bulk">
              <label>User type<select v-model="bulkRole"><option value="owner">Owners</option><option value="staff">Staff</option></select></label>
              <button class="btn" :disabled="bulkSaving || !selectedPermissionUserId" @click="bulkConfirmOpen = true">
                Apply to all
              </button>
            </div>
          </div>
          <div class="table-wrap"><table><thead><tr><th>Module</th><th v-for="action in ['view','create','update','delete','export','override']" :key="action">{{ action }}</th></tr></thead>
            <tbody><tr v-for="(actions, module) in permissionData.modules" :key="module">
              <td class="capitalize"><strong>{{ String(module).replaceAll('_', ' ') }}</strong></td>
              <td v-for="action in ['view','create','update','delete','export','override']" :key="action">
                <input v-if="actions.includes(action)" v-model="selectedPermissions" type="checkbox" :value="`${module}.${action}`" />
                <span v-else>—</span>
              </td>
            </tr></tbody></table></div>
          <p class="permission-note">Changes apply only to the selected user. Other owners and staff keep their own permission settings. Super Admin always retains full access.</p>
        </div>
        <div v-else-if="tab === 'plans' && rows.length" class="table-wrap">
          <table><thead><tr><th>Plan</th><th>Period</th><th>Price</th><th>Vehicle limit</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody><tr v-for="offering in rows" :key="offering.id"><td><strong>{{ offering.name }}</strong><small class="cell-small capitalize">{{ offering.plan }}</small></td><td>{{ offering.duration_months === 12 ? '1 year' : `${offering.duration_months} month${offering.duration_months > 1 ? 's' : ''}` }}</td><td>{{ transactionCurrency.format(Number(offering.price)) }}</td><td>{{ offering.vehicle_limit }}</td><td>{{ offering.details || '—' }}</td><td><StatusBadge :status="offering.is_active ? 'Active' : 'Inactive'" /></td><td><button class="icon-btn" title="Edit plan" @click="openPlanOffering(offering)"><Pencil /></button></td></tr></tbody></table>
        </div><EmptyState
          v-else-if="!rows.length"
          :title="`No ${tab} found`"
        />
        <div v-else class="table-wrap">
          <BusinessTable v-if="tab === 'businesses'" :businesses="rows" @edit="edit" @support="openBusinessSupport" @view="viewBusiness" />
          <table v-else-if="tab === 'payment-methods'">
            <thead><tr><th>Payment method</th><th>Account name</th><th>Account number</th><th>QR</th><th>Created</th><th>Action</th></tr></thead>
            <tbody><tr v-for="method in rows" :key="method.id"><td><strong>{{ method.name }}</strong></td><td>{{ method.account_name }}</td><td>{{ method.account_number }}</td><td><button v-if="method.qr_path" type="button" class="btn btn-small" @click="viewPaymentQr(method)"><QrCode />View QR</button><span v-else>—</span></td><td>{{ formatDate(method.created_at) }}</td><td><span class="row-actions"><button type="button" class="icon-btn" title="Edit payment method" @click="editPaymentMethod(method)"><Pencil /></button><button type="button" class="icon-btn" title="Delete payment method" @click="deletingPaymentMethod = method"><Trash2 /></button></span></td></tr></tbody>
          </table>
          <table v-else-if="tab === 'transactions'">
            <thead><tr><th>Business</th><th>Plan</th><th class="transaction-nowrap">Reference</th><th>Payment status</th><th class="transaction-nowrap">Action</th></tr></thead>
            <tbody><tr v-for="transaction in rows" :key="transaction.id">
              <td><button type="button" class="business-name-link" @click="viewBusiness(transaction.business)">{{ transaction.business?.name }}</button><small class="cell-small">{{ transaction.business?.email }}</small></td>
              <td class="capitalize">{{ transaction.plan }}</td>
              <td class="transaction-nowrap">{{ transaction.reference || '—' }}</td>
              <td><StatusBadge :status="transaction.payment_status === 'paid' ? 'Paid' : 'Not paid'" /></td>
              <td class="transaction-nowrap"><button type="button" class="btn btn-small" @click="viewTransactionInformation(transaction)">View information</button></td>
            </tr></tbody>
          </table>
          <table v-else-if="tab === 'users'">
            <thead>
              <tr>
                <th>User</th>
                <th>Business</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="owner in rows" :key="owner.id">
                <tr class="owner-row">
                  <td
                    class="owner-cell"
                  >
                    <span class="owner-toggle">
                      <button
                        class="owner-expand"
                        :aria-label="expandedOwners.has(owner.id) ? 'Hide staff' : 'Show staff'"
                        :aria-expanded="expandedOwners.has(owner.id)"
                        @click="toggleOwner(owner.id)"
                      >
                        <ChevronDown v-if="expandedOwners.has(owner.id)" />
                        <ChevronRight v-else />
                      </button>
                      <span>
                        <button class="user-dashboard-link" :disabled="impersonatingUserId === owner.id" @click="openUserDashboard(owner.id)">{{ owner.name }}</button>
                        <small class="cell-small">{{ owner.email }}</small>
                      </span>
                    </span>
                  </td>
                  <td><button v-if="owner.business" type="button" class="business-name-link" @click="viewBusiness(owner.business)">{{ owner.business.name }}</button><span v-else>—</span></td>
                  <td class="capitalize">{{ owner.role.replaceAll("_", " ") }}</td>
                  <td><StatusBadge :status="owner.status" /></td>
                  <td>{{ formatDate(owner.created_at) }}</td>
                  <td>
                    <span class="row-actions">
                      <button class="icon-btn" title="Edit permissions" aria-label="Edit permissions" @click="openUserPermissions(owner.id)"><ShieldCheck /></button>
                      <button class="icon-btn" title="Edit user" aria-label="Edit user" @click="edit(owner)"><Pencil /></button>
                    </span>
                  </td>
                </tr>
                <tr
                  v-for="staff in expandedOwners.has(owner.id) ? visibleStaff(owner) : []"
                  :key="staff.id"
                  class="staff-row"
                >
                  <td>
                    <span class="staff-cell">
                      <span>
                        <button class="user-dashboard-link" :disabled="impersonatingUserId === staff.id" @click="openUserDashboard(staff.id)">{{ staff.name }}</button>
                        <small class="cell-small">{{ staff.email }}</small>
                      </span>
                    </span>
                  </td>
                  <td><button v-if="owner.business" type="button" class="business-name-link" @click="viewBusiness(owner.business)">{{ owner.business.name }}</button><span v-else>—</span></td>
                  <td class="capitalize">{{ staff.role.replaceAll("_", " ") }}</td>
                  <td><StatusBadge :status="staff.status" /></td>
                  <td>{{ formatDate(staff.created_at) }}</td>
                  <td>
                    <span class="row-actions">
                      <button class="icon-btn" title="Edit permissions" aria-label="Edit permissions" @click="openUserPermissions(staff.id)"><ShieldCheck /></button>
                      <button class="icon-btn" title="Edit user" aria-label="Edit user" @click="edit(staff)"><Pencil /></button>
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <PaginationControls
          v-if="meta && tab !== 'permissions' && tab !== 'support'"
          :meta="meta"
          v-model:page="page"
          v-model:per-page="perPage"
        />
      </div>
      </main>
    </section>
    <ConfirmDeleteModal
      :open="bulkConfirmOpen"
      :loading="bulkSaving"
      title="Apply permissions to all users?"
      :message="`This will replace the individual permissions of every ${bulkRole} user with the currently checked permissions.`"
      confirm-label="Apply to all"
      @cancel="bulkConfirmOpen = false"
      @confirm="applyPermissionsToAll"
    />
    <div v-if="planOfferingModalOpen" class="modal-backdrop" @click.self="planOfferingModalOpen = false">
      <form class="modal plan-offering-modal" @submit.prevent="savePlanOffering">
        <div class="modal-head">
          <div>
            <h2>{{ editingPlanOffering ? "Edit plan" : "Add plan" }}</h2>
            <p>Configure the price and details shown to owners.</p>
          </div>
          <button type="button" class="icon-btn" aria-label="Close plan editor" @click="planOfferingModalOpen = false"><X /></button>
        </div>
        <div class="field-grid plan-offering-fields">
          <label>
            Plan
            <select v-model="planOfferingForm.plan" required>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label>
            Display name
            <input v-model="planOfferingForm.name" required maxlength="100" />
          </label>
          <label>
            Billing period
            <select v-model.number="planOfferingForm.duration_months" required>
              <option :value="1">1 month</option>
              <option :value="6">6 months</option>
              <option :value="12">1 year</option>
            </select>
          </label>
          <label>
            Price
            <input v-model="planOfferingForm.price" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Vehicle limit
            <input v-model.number="planOfferingForm.vehicle_limit" type="number" min="1" required />
          </label>
          <label>
            Status
            <select v-model="planOfferingForm.is_active">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </label>
          <label class="full">
            Details
            <textarea v-model="planOfferingForm.details" rows="4" maxlength="1000" placeholder="Describe the benefits included with this plan."></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="planOfferingModalOpen = false">Cancel</button>
          <button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving…" : "Save plan" }}</button>
        </div>
      </form>
    </div>
    <ConfirmDeleteModal :open="!!deletingPaymentMethod" :loading="saving" title="Delete payment method?" :message="`This will permanently remove ${deletingPaymentMethod?.name || 'this payment method'} and its QR image.`" @cancel="deletingPaymentMethod = null" @confirm="deletePaymentMethod" />
    <div v-if="selectedAdminTransaction" class="modal-backdrop" @click.self="selectedAdminTransaction = null">
      <section class="modal transaction-information-modal" role="dialog" aria-modal="true" aria-label="Transaction information">
        <div class="modal-head">
          <div><h2>Transaction information</h2><p>{{ selectedAdminTransaction.reference || 'No reference number' }}</p></div>
          <button type="button" class="icon-btn" aria-label="Close transaction information" @click="selectedAdminTransaction = null"><X /></button>
        </div>
        <div class="transaction-information-grid">
          <div><span>Business</span><button type="button" class="business-name-link" @click="viewBusiness(selectedAdminTransaction.business)">{{ selectedAdminTransaction.business?.name || '—' }}</button></div>
          <div><span>Plan</span><strong class="capitalize">{{ selectedAdminTransaction.plan }}</strong></div>
          <div><span>Amount</span><strong>{{ transactionCurrency.format(Number(selectedAdminTransaction.amount)) }}</strong></div>
          <div><span>Payment status</span><StatusBadge :status="selectedAdminTransaction.payment_status === 'paid' ? 'Paid' : 'Not paid'" /></div>
          <div><span>Payment method</span><strong>{{ selectedAdminTransaction.selected_payment_method?.name || selectedAdminTransaction.payment_method || '—' }}</strong></div>
          <div><span>Account name</span><strong>{{ selectedAdminTransaction.selected_payment_method?.account_name || '—' }}</strong></div>
          <div><span>Account number</span><strong>{{ selectedAdminTransaction.selected_payment_method?.account_number || '—' }}</strong></div>
          <div><span>Payment date</span><strong>{{ formatDate(selectedAdminTransaction.paid_at) }}</strong></div>
          <div><span>Plan period</span><strong>{{ formatDate(selectedAdminTransaction.starts_at) }} – {{ formatDate(selectedAdminTransaction.ends_at) }}</strong></div>
          <div><span>Recorded by</span><strong>{{ selectedAdminTransaction.creator?.name || '—' }}</strong></div>
          <div class="transaction-information-wide"><span>Reference</span><strong>{{ selectedAdminTransaction.reference || '—' }}</strong></div>
          <div class="transaction-information-wide"><span>Transaction status</span><select class="transaction-status-select" :value="selectedAdminTransaction.status" :disabled="updatingTransactionId === selectedAdminTransaction.id" @change="updateTransactionStatus(selectedAdminTransaction, ($event.target as HTMLSelectElement).value)"><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select></div>
          <div v-if="selectedAdminTransaction.notes" class="transaction-information-wide"><span>Notes</span><p>{{ selectedAdminTransaction.notes }}</p></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="selectedAdminTransaction = null">Close</button>
          <button type="button" class="btn btn-primary" @click="copyTransactionLink(selectedAdminTransaction)"><Copy />{{ copiedTransactionId === selectedAdminTransaction.id ? 'Copied' : 'Copy transaction link' }}</button>
        </div>
      </section>
    </div>
    <div v-if="qrPreview" class="modal-backdrop" @click.self="closeQrPreview">
      <section class="modal payment-qr-modal" role="dialog" aria-modal="true" :aria-label="`${qrPreview.name} QR code`">
        <div class="modal-head"><div><h2>{{ qrPreview.name }}</h2><p>Scan this QR code to make a payment.</p></div><button type="button" class="icon-btn" aria-label="Close QR preview" @click="closeQrPreview"><X /></button></div>
        <div class="payment-qr-preview"><img :src="qrPreview.url" :alt="`${qrPreview.name} payment QR code`" /></div>
      </section>
    </div>
    <div v-if="paymentMethodModalOpen" class="modal-backdrop" @click.self="paymentMethodModalOpen = false">
      <form class="modal" @submit.prevent="savePaymentMethod">
        <div class="modal-head"><div><h2>{{ editingPaymentMethod ? 'Edit' : 'Add' }} payment method</h2><p>Configure payment instructions for plan purchases.</p></div><button type="button" class="icon-btn" @click="paymentMethodModalOpen = false"><X /></button></div>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div class="field-grid">
          <label>Payment method<select v-model="paymentMethodForm.name" required><option disabled value="">Select a payment method</option><option>Maya</option><option>GCash</option><option>BDO</option><option>Chinabank</option><option>UnionBank</option></select><small v-if="paymentMethodErrors.name">{{ paymentMethodErrors.name[0] }}</small></label>
          <label>Account name<input v-model="paymentMethodForm.account_name" required maxlength="150" /><small v-if="paymentMethodErrors.account_name">{{ paymentMethodErrors.account_name[0] }}</small></label>
          <label>Account number<input v-model="paymentMethodForm.account_number" required maxlength="150" /><small v-if="paymentMethodErrors.account_number">{{ paymentMethodErrors.account_number[0] }}</small></label>
          <label class="full">QR image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" @change="choosePaymentQr" /><small>JPG, PNG, or WebP up to 5 MB.</small><small v-if="paymentMethodErrors.qr">{{ paymentMethodErrors.qr[0] }}</small></label>
          <label v-if="editingPaymentMethod?.qr_path && !paymentMethodQr" class="full checkbox-label"><input v-model="paymentMethodForm.remove_qr" type="checkbox" />Remove current QR image</label>
        </div>
        <div class="modal-actions"><button type="button" class="btn" @click="paymentMethodModalOpen = false">Cancel</button><button class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save payment method' }}</button></div>
      </form>
    </div>
    <div v-if="transactionModalOpen" class="modal-backdrop" @click.self="transactionModalOpen = false">
      <form class="modal" @submit.prevent="createTransaction">
        <div class="modal-head"><div><h2>New plan transaction</h2><p>Record a plan purchase and activate its billing period.</p></div><button type="button" class="icon-btn" @click="transactionModalOpen = false"><X /></button></div>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div class="field-grid">
          <label>Business<select v-model="transactionForm.business_id" required><option disabled value="">Select a business</option><option v-for="business in transactionBusinesses" :key="business.id" :value="business.id">{{ business.name }}</option></select><small v-if="transactionErrors.business_id">{{ transactionErrors.business_id[0] }}</small></label>
          <label>Plan<select v-model="transactionForm.plan" required><option value="trial">Trial</option><option value="starter">Starter</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></label>
          <label>Amount<input v-model="transactionForm.amount" type="number" min="0" step="0.01" required placeholder="0.00" /><small v-if="transactionErrors.amount">{{ transactionErrors.amount[0] }}</small></label>
          <label>Payment method<select v-model="transactionForm.payment_method_id" required><option disabled value="">Select a payment method</option><option v-for="method in transactionPaymentMethods" :key="method.id" :value="method.id">{{ method.name }} — {{ method.account_name }} — {{ method.account_number }}</option></select><small v-if="!transactionPaymentMethods.length">Add a payment method before creating a transaction.</small><small v-if="transactionErrors.payment_method_id">{{ transactionErrors.payment_method_id[0] }}</small></label>
          <label>Reference<input value="Automatically generated after creation" disabled /><small>Format: BUSINESS-NAME-YYYYMMDD-UNIQUECODE</small></label>
          <label>Payment date<input v-model="transactionForm.paid_at" type="date" required /></label>
          <label>Plan starts<input v-model="transactionForm.starts_at" type="date" required /></label>
          <label>Plan ends<input v-model="transactionForm.ends_at" type="date" required /><small v-if="transactionErrors.ends_at">{{ transactionErrors.ends_at[0] }}</small></label>
          <label class="full">Notes<textarea v-model="transactionForm.notes" rows="3" maxlength="2000"></textarea></label>
        </div>
        <div class="modal-actions"><button type="button" class="btn" @click="transactionModalOpen = false">Cancel</button><button class="btn btn-primary" :disabled="saving || !transactionPaymentMethods.length">{{ saving ? 'Creating…' : 'Create transaction' }}</button></div>
      </form>
    </div>
    <div v-if="templateModalOpen" class="modal-backdrop" @click.self="templateModalOpen = false">
      <form class="modal template-modal" @submit.prevent="createSupportTemplate">
        <div class="modal-head"><div><h2>{{ editingTemplate ? 'Edit' : 'Add' }} message template</h2><p>{{ editingTemplate ? 'Update this reusable support reply.' : 'Create a reusable Super Admin support reply.' }}</p></div><button type="button" class="icon-btn" @click="templateModalOpen = false"><X /></button></div>
        <div class="field-grid"><label class="full">Template name<input v-model="templateForm.title" maxlength="100" required /><small v-if="templateErrors.title">{{ templateErrors.title[0] }}</small></label><label class="full">Message<textarea v-model="templateForm.message" maxlength="5000" rows="6" required></textarea><small v-if="templateErrors.message">{{ templateErrors.message[0] }}</small><small>Use <code v-pre>{{dashboard_url}}</code> to insert the dashboard link.</small></label></div>
        <div class="modal-actions"><button type="button" class="btn" @click="templateModalOpen = false">Cancel</button><button class="btn btn-primary" :disabled="templateSaving">{{ templateSaving ? 'Saving...' : editingTemplate ? 'Save changes' : 'Create template' }}</button></div>
      </form>
    </div>
    <div v-if="creatingOwner" class="modal-backdrop" @click.self="creatingOwner = false">
      <form class="modal" @submit.prevent="createOwner">
        <div class="modal-head">
          <div>
            <h2>Add owner</h2>
            <p>Create a new tenant business and its owner account.</p>
          </div>
          <button type="button" class="icon-btn" @click="creatingOwner = false"><X /></button>
        </div>
        <div v-if="error" class="alert error">{{ error }}</div>
        <div class="field-grid">
          <label>Business name<input v-model="ownerForm.business_name" required /><small v-if="createErrors.business_name">{{ createErrors.business_name[0] }}</small></label>
          <label>Owner name<input v-model="ownerForm.owner_name" required /><small v-if="createErrors.owner_name">{{ createErrors.owner_name[0] }}</small></label>
          <label>Email<input v-model="ownerForm.email" type="email" required /><small v-if="createErrors.email">{{ createErrors.email[0] }}</small></label>
          <label>Phone<input v-model="ownerForm.phone" /></label>
          <label>Plan<select v-model="ownerForm.subscription_plan"><option value="trial">Trial — 3 vehicles</option><option value="starter">Starter — 5 vehicles</option><option value="business">Business — 25 vehicles</option><option value="enterprise">Enterprise — 100 vehicles</option></select></label>
          <label>Status<input :value="statusFromPlanEnd(ownerForm.plan_ends_at).replace('_', ' ')" disabled /><small>Automatically based on the plan end date.</small></label>
          <label>Custom vehicle limit<input v-model.number="ownerForm.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Optional. Leave blank to use the plan limit.</small><small v-if="createErrors.vehicle_limit_override">{{ createErrors.vehicle_limit_override[0] }}</small></label>
          <label>Plan ends<input v-model="ownerForm.plan_ends_at" type="date" required /><small v-if="createErrors.plan_ends_at">{{ createErrors.plan_ends_at[0] }}</small></label>
          <label>Password<input v-model="ownerForm.password" type="password" autocomplete="new-password" required /><small v-if="createErrors.password">{{ createErrors.password[0] }}</small></label>
          <label>Confirm password<input v-model="ownerForm.password_confirmation" type="password" autocomplete="new-password" required /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="creatingOwner = false">Cancel</button>
          <button class="btn btn-primary" :disabled="saving">{{ saving ? "Creating…" : "Create owner" }}</button>
        </div>
      </form>
    </div>
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <form class="modal" @submit.prevent="save">
        <div class="modal-head">
          <div>
            <h2>Edit {{ tab === "businesses" ? "business" : "user" }}</h2>
            <p>Platform-level account management</p>
          </div>
          <button type="button" class="icon-btn" @click="editing = null">
            <X />
          </button>
        </div>
        <div v-if="tab === 'businesses'" class="field-grid">
          <label>Business name<input v-model="form.name" required /></label
          ><label
            >Email<input v-model="form.email" type="email" required /></label
          ><label
            >Plan<select v-model="form.subscription_plan">
              <option>trial</option>
              <option>starter</option>
              <option>business</option>
              <option>enterprise</option>
            </select></label
          ><label>Business access<select v-model="form.status"><option value="active">Active</option><option value="inactive">Inactive / Disabled</option></select><small>Inactive blocks the owner and all staff accounts.</small></label
          ><label>Plan status<input :value="statusFromPlanEnd(form.plan_ends_at).replace('_', ' ')" disabled /><small>Automatically based on the plan end date.</small></label
          ><label>Custom vehicle limit<input v-model.number="form.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Leave blank to use the selected plan limit.</small></label
          ><label
            >Plan ends<input v-model="form.plan_ends_at" type="date"
          /></label>
        </div>
        <div v-else class="field-grid">
          <label>Name<input v-model="form.name" required /></label
          ><label
            >Email<input v-model="form.email" type="email" required /></label
          ><label
            >Role<select v-model="form.role">
              <option>owner</option>
              <option>staff</option>
            </select></label
          ><label
            >Status<select v-model="form.status">
              <option>active</option>
              <option>inactive</option>
            </select></label
          ><label
            >Password<input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
            /><small>Leave blank to keep current password</small></label
          ><label v-if="form.role === 'owner'">Custom vehicle limit<input v-model.number="form.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Leave blank to use this owner’s plan limit.</small></label
          ><label
            >Confirm password<input
              v-model="form.password_confirmation"
              type="password"
              autocomplete="new-password"
          /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="editing = null">
            Cancel</button
          ><button class="btn btn-primary" :disabled="saving">
            {{ saving ? "Saving…" : "Save changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
