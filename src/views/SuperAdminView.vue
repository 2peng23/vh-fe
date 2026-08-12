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
  Send,
  Paperclip,
  Download,
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
import { formatDate } from "../utils/date";

const auth = useAuthStore(),
  router = useRouter(),
  tab = ref<"businesses" | "users" | "permissions" | "support">("businesses"),
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
const supportConversations = ref<any[]>([]);
const selectedSupportBusiness = ref<any | null>(null);
const supportMessages = ref<any[]>([]);
const supportReply = ref("");
const supportTemplates = ref<any[]>([]);
const templateModalOpen = ref(false);
const templateSaving = ref(false);
const templateErrors = ref<Record<string, string[]>>({});
const templateForm = reactive({ title: "", message: "" });
const supportAttachment = ref<File | null>(null);
const supportAttachmentInput = ref<HTMLInputElement>();
const supportThread = ref<HTMLElement>();
const supportHasMore = ref(false);
const supportLoadingOlder = ref(false);
const supportUnreadTotal = computed(() => supportConversations.value.reduce(
  (total, business) => total + Number(business.unread_support_count || 0), 0,
));
async function scrollSupportToBottom() {
  await nextTick();
  window.requestAnimationFrame(() => {
    if (supportThread.value) supportThread.value.scrollTop = supportThread.value.scrollHeight;
  });
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
const todayInManila = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    const { data } = await api.get<ApiEnvelope<any[]>>(
      `/superadmin/${tab.value}`,
      {
        params: {
          search: search.value,
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
function selectTab(value: "businesses" | "users" | "permissions" | "support") {
  if (value === "support" && tab.value !== "support") {
    selectedSupportBusiness.value = null;
    supportMessages.value = [];
    supportReply.value = "";
  }
  tab.value = value;
  page.value = 1;
  load();
}
async function loadSupportConversations() {
  const { data } = await api.get<ApiEnvelope<any[]>>("/superadmin/support/conversations");
  supportConversations.value = data.data;
  if (selectedSupportBusiness.value) {
    const refreshed = data.data.find((item: any) => supportConversationKey(item) === supportConversationKey(selectedSupportBusiness.value));
    if (refreshed) selectedSupportBusiness.value = refreshed;
  }
}
function supportConversationKey(item: any) {
  return `${item.conversation_type || "business"}-${item.id}`;
}
function supportConversationPath(item: any) {
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
    const { data } = await api.post("/superadmin/support/templates", templateForm);
    supportTemplates.value.push(data.data);
    supportTemplates.value.sort((a, b) => a.title.localeCompare(b.title));
    templateModalOpen.value = false;
    templateForm.title = "";
    templateForm.message = "";
  } catch (e) {
    templateErrors.value = validationErrors(e);
    error.value = errorMessage(e);
  } finally {
    templateSaving.value = false;
  }
}
async function selectSupportBusiness(business: any) {
  selectedSupportBusiness.value = business;
  const { data } = await api.get<ApiEnvelope<any[]>>(supportConversationPath(business));
  supportMessages.value = data.data;
  supportHasMore.value = (data.meta as any)?.has_more || false;
  business.unread_support_count = 0;
  await scrollSupportToBottom();
}
async function viewSupportBusiness(business: any) {
  if (business.conversation_type === "guest") return;
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
  const element = supportThread.value;
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
function handleSupportThreadScroll() {
  if ((supportThread.value?.scrollTop || 0) <= 20) loadOlderSupportMessages();
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
    if (supportAttachmentInput.value) supportAttachmentInput.value.value = "";
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
function supportTemplatePreview(message: string) {
  return message.replace("{{dashboard_url}}", `${window.location.origin}/`);
}
function messageParts(value: string) {
  return String(value || "").split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((text) => ({ text, url: /^https?:\/\//.test(text) }));
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
function supportFileSize(bytes: number) {
  return bytes < 1048576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
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
});
</script>
<template>
  <div class="superadmin-shell">
    <header class="superadmin-topbar">
      <AppLogo />
      <div>
        <span><ShieldCheck />Platform administration</span
        ><strong>{{ auth.user?.name }}</strong
        ><button class="btn" @click="logout"><LogOut />Sign out</button>
      </div>
    </header>
    <main class="superadmin-content">
      <div class="superadmin-heading">
        <div>
          <span class="eyebrow">VEHICLE HUB CONTROL CENTER</span>
          <h1>Super Admin Dashboard</h1>
          <p>Manage businesses, subscriptions, and every tenant user.</p>
        </div>
        <button class="btn btn-primary" @click="openCreateOwner">
          <Plus /> Add owner
        </button>
      </div>
      <div class="superadmin-stats">
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
      <div class="superadmin-panel card">
        <div class="superadmin-toolbar">
          <div class="tabs">
            <button
              :class="{ active: tab === 'businesses' }"
              @click="selectTab('businesses')"
            >
              Businesses</button
            ><button
              :class="{ active: tab === 'users' }"
              @click="selectTab('users')"
            >
              All users
            </button><button
              :class="{ active: tab === 'permissions' }"
              @click="selectTab('permissions')"
            >Permissions</button>
            <button :class="{ active: tab === 'support', unread: supportUnreadTotal > 0 }" @click="selectTab('support')"><MessageCircle />Support<em v-if="supportUnreadTotal" class="support-tab-count">{{ supportUnreadTotal > 99 ? '99+' : supportUnreadTotal }}</em></button>
          </div>
          <div v-if="tab !== 'permissions' && tab !== 'support'" class="superadmin-search">
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
        </div>
        <div v-if="error" class="alert error">{{ error }}</div>
        <LoadingState v-if="loading" />
        <div v-else-if="tab === 'support'" class="support-admin">
          <aside class="support-conversations">
            <div class="support-section-title"><strong>Support messages</strong><small>{{ supportConversations.length }} conversations</small></div>
            <button v-for="business in supportConversations" :key="supportConversationKey(business)" :class="{ active: selectedSupportBusiness && supportConversationKey(selectedSupportBusiness) === supportConversationKey(business), unread: business.unread_support_count > 0 }" @click="selectSupportBusiness(business)">
              <span><span class="conversation-title"><strong>{{ business.name }}</strong><em v-if="business.conversation_type === 'guest'" class="guest-label">Guest</em><em v-if="business.unread_support_count" class="conversation-unread-count">{{ business.unread_support_count > 99 ? '99+' : business.unread_support_count }}</em></span><small>{{ business.email }}</small></span>
            </button>
            <p v-if="!supportConversations.length" class="support-empty">No support messages yet.</p>
          </aside>
          <section class="support-admin-thread">
            <template v-if="selectedSupportBusiness">
              <header><div><button type="button" class="support-business-link" :class="{ disabled: selectedSupportBusiness.conversation_type === 'guest' }" :title="selectedSupportBusiness.conversation_type === 'guest' ? 'Guest conversation' : 'View business'" @click="viewSupportBusiness(selectedSupportBusiness)">{{ selectedSupportBusiness.name }}</button><small>{{ selectedSupportBusiness.email }}</small></div><StatusBadge v-if="selectedSupportBusiness.subscription_status" :status="selectedSupportBusiness.subscription_status" /><span v-else class="guest-label">Guest</span></header>
              <div ref="supportThread" class="support-thread" @scroll="handleSupportThreadScroll">
                <p v-if="supportLoadingOlder" class="support-history-loading">Loading earlier messages…</p>
                <article v-for="item in supportMessages" :key="item.id" :class="['support-bubble', item.sender_type === 'super_admin' ? 'mine' : 'theirs']">
                  <p v-if="item.message"><template v-for="(part, index) in messageParts(item.message)" :key="index"><a v-if="part.url" :href="part.text" target="_blank" rel="noopener">{{ part.text }}</a><span v-else>{{ part.text }}</span></template></p>
                  <button v-if="item.attachment_name" type="button" class="support-attachment" @click="downloadSupportAttachment(item)"><Paperclip /><span><strong>{{ item.attachment_name }}</strong><small>{{ supportFileSize(item.attachment_size) }}</small></span><Download /></button>
                  <small>{{ formatDate(item.created_at) }}</small>
                </article>
              </div>
              <form class="support-composer" @submit.prevent="sendSupportReply"><div class="support-compose-main"><textarea v-model="supportReply" maxlength="5000" placeholder="Reply to this business…"></textarea><span v-if="supportAttachment" class="selected-attachment"><Paperclip />{{ supportAttachment.name }}<button type="button" @click="supportAttachment = null"><X /></button></span></div><label class="icon-btn attachment-picker" title="Attach file"><Paperclip /><input ref="supportAttachmentInput" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" @change="chooseSupportAttachment" /></label><button class="btn btn-primary" :disabled="saving || (!supportReply.trim() && !supportAttachment)"><Send />Reply</button></form>
            </template>
            <div v-else class="support-empty"><MessageCircle /><strong>Select a conversation</strong></div>
          </section>
          <aside class="support-templates-panel">
            <div class="support-section-title template-panel-head"><span><strong>Message templates</strong><small>Click to use a quick reply</small></span><button type="button" class="icon-btn" title="Add message template" @click="templateModalOpen = true"><Plus /></button></div>
            <div class="support-template-list">
              <button v-for="template in supportTemplates" :key="template.id" type="button" :disabled="!selectedSupportBusiness" @click="applySupportTemplate(template.message)">
                <strong>{{ template.title }}</strong><span>{{ supportTemplatePreview(template.message) }}</span>
              </button>
            </div>
          </aside>
        </div>
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
        </div><EmptyState
          v-else-if="!rows.length"
          :title="`No ${tab} found`"
        />
        <div v-else class="table-wrap">
          <table v-if="tab === 'businesses'">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Users</th>
                <th>Vehicles</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <strong>{{ row.name }}</strong
                  ><small class="cell-small">{{ row.email }}</small>
                </td>
                <td>
                  {{ row.users?.[0]?.name || "—"
                  }}<small class="cell-small">{{
                    row.users?.[0]?.email
                  }}</small>
                </td>
                <td>{{ row.users_count }}</td>
                <td>{{ row.vehicles_count }} / {{ row.subscription?.vehicle_limit }}</td>
                <td class="capitalize">{{ row.subscription?.label || row.subscription_plan }}</td>
                <td><StatusBadge :status="row.subscription_status" /></td>
                <td>
                  <button class="icon-btn" @click="edit(row)">
                    <Pencil />
                  </button>
                </td>
              </tr>
            </tbody>
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
                  <td>{{ owner.business?.name || "—" }}</td>
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
                  <td>{{ owner.business?.name || "—" }}</td>
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
    <ConfirmDeleteModal
      :open="bulkConfirmOpen"
      :loading="bulkSaving"
      title="Apply permissions to all users?"
      :message="`This will replace the individual permissions of every ${bulkRole} user with the currently checked permissions.`"
      confirm-label="Apply to all"
      @cancel="bulkConfirmOpen = false"
      @confirm="applyPermissionsToAll"
    />
    <div v-if="templateModalOpen" class="modal-backdrop" @click.self="templateModalOpen = false">
      <form class="modal template-modal" @submit.prevent="createSupportTemplate">
        <div class="modal-head"><div><h2>Add message template</h2><p>Create a reusable Super Admin support reply.</p></div><button type="button" class="icon-btn" @click="templateModalOpen = false"><X /></button></div>
        <div class="field-grid"><label class="full">Template name<input v-model="templateForm.title" maxlength="100" required /><small v-if="templateErrors.title">{{ templateErrors.title[0] }}</small></label><label class="full">Message<textarea v-model="templateForm.message" maxlength="5000" rows="6" required></textarea><small v-if="templateErrors.message">{{ templateErrors.message[0] }}</small><small>Use <code v-pre>{{dashboard_url}}</code> to insert the dashboard link.</small></label></div>
        <div class="modal-actions"><button type="button" class="btn" @click="templateModalOpen = false">Cancel</button><button class="btn btn-primary" :disabled="templateSaving">{{ templateSaving ? 'Creating…' : 'Create template' }}</button></div>
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
          ><label>Status<input :value="statusFromPlanEnd(form.plan_ends_at).replace('_', ' ')" disabled /><small>Automatically based on the plan end date.</small></label
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
