<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../../api/client";
import type { ApiEnvelope } from "../../../types";
import type { AdminBusiness, ValidationBag } from "../../../types/admin";
import type { SupportConversation, SupportMessage, SupportTemplate } from "../../../types/support";
import AdminSupportPanel from "../../support/AdminSupportPanel.vue";

const props = defineProps<{ initialBusiness?: AdminBusiness | null }>();
const emit = defineEmits<{
  openBusiness: [business: AdminBusiness];
  unreadCount: [count: number];
}>();

const conversations = ref<SupportConversation[]>([]);
const selected = ref<SupportConversation | null>(null);
const messages = ref<SupportMessage[]>([]);
const reply = ref("");
const templates = ref<SupportTemplate[]>([]);
const attachment = ref<File | null>(null);
const panel = ref<InstanceType<typeof AdminSupportPanel>>();
const hasMore = ref(false);
const loadingOlder = ref(false);
const saving = ref(false);
const error = ref("");
const templateModalOpen = ref(false);
const editingTemplate = ref<SupportTemplate | null>(null);
const templateSaving = ref(false);
const templateErrors = ref<ValidationBag>({});
const templateForm = reactive({ title: "", message: "" });
let refreshTimer: number | undefined;
let refreshing = false;

function conversationKey(item: SupportConversation) {
  return `${item.conversation_type || "business"}-${item.id}`;
}

function conversationPath(item: SupportConversation) {
  return `/superadmin/support/${item.conversation_type === "guest" ? "guests" : "businesses"}/${item.id}`;
}

async function scrollToBottom() {
  await nextTick();
  await panel.value?.scrollToBottom();
}

async function loadConversations() {
  const { data } = await api.get<ApiEnvelope<SupportConversation[]>>("/superadmin/support/conversations");
  conversations.value = data.data;
  emit("unreadCount", data.data.reduce((total, item) => total + Number(item.unread_support_count || 0), 0));

  if (selected.value) {
    const refreshed = data.data.find((item) => conversationKey(item) === conversationKey(selected.value!));
    if (refreshed) selected.value = refreshed;
  }
}

async function loadTemplates() {
  const { data } = await api.get<ApiEnvelope<SupportTemplate[]>>("/superadmin/support/templates");
  templates.value = data.data;
}

async function selectConversation(conversation: SupportConversation) {
  selected.value = conversation;
  const { data } = await api.get<ApiEnvelope<SupportMessage[]>>(conversationPath(conversation));
  messages.value = data.data;
  hasMore.value = Boolean((data.meta as { has_more?: boolean } | undefined)?.has_more);
  conversation.unread_support_count = 0;
  emit("unreadCount", conversations.value.reduce((total, item) => total + Number(item.unread_support_count || 0), 0));
  await scrollToBottom();
}

async function selectInitialBusiness(business: AdminBusiness) {
  const conversation = conversations.value.find(
    (item) => item.conversation_type !== "guest" && item.id === business.id,
  ) || ({ ...business, conversation_type: "business", unread_support_count: 0 } as unknown as SupportConversation);
  await selectConversation(conversation);
}

async function loadOlderMessages() {
  if (loadingOlder.value || !hasMore.value || !messages.value.length || !selected.value) return;
  loadingOlder.value = true;
  const element = panel.value?.threadElement();
  const previousHeight = element?.scrollHeight || 0;
  try {
    const { data } = await api.get<ApiEnvelope<SupportMessage[]>>(conversationPath(selected.value), {
      params: { before_id: messages.value[0].id },
    });
    messages.value = [...data.data, ...messages.value];
    hasMore.value = Boolean((data.meta as { has_more?: boolean } | undefined)?.has_more);
    await nextTick();
    if (element) element.scrollTop += element.scrollHeight - previousHeight;
  } finally {
    loadingOlder.value = false;
  }
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    await loadConversations();
    if (selected.value) {
      const previousLastId = messages.value.at(-1)?.id;
      const { data } = await api.get<ApiEnvelope<SupportMessage[]>>(conversationPath(selected.value));
      const nextLastId = data.data.at(-1)?.id;
      const merged = new Map(messages.value.map((item) => [item.id, item]));
      data.data.forEach((item) => merged.set(item.id, item));
      messages.value = [...merged.values()].sort((a, b) => a.id - b.id);
      if (previousLastId !== nextLastId) await scrollToBottom();
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    refreshing = false;
  }
}

async function sendReply() {
  const text = reply.value.trim();
  if ((!text && !attachment.value) || !selected.value) return;
  saving.value = true;
  try {
    const payload = new FormData();
    if (text) payload.append("message", text);
    if (attachment.value) payload.append("attachment", attachment.value);
    const { data } = await api.post<ApiEnvelope<SupportMessage>>(conversationPath(selected.value), payload);
    messages.value.push(data.data);
    reply.value = "";
    attachment.value = null;
    await scrollToBottom();
    await loadConversations();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

function chooseAttachment(event: Event) {
  attachment.value = (event.target as HTMLInputElement).files?.[0] || null;
}

function applyTemplate(message: string) {
  reply.value = message.replace("{{dashboard_url}}", `${window.location.origin}/`);
}

async function downloadAttachment(item: SupportMessage) {
  const response = await api.get(`/support/attachments/${item.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.attachment_name || "attachment";
  link.click();
  URL.revokeObjectURL(url);
}

function addTemplate() {
  editingTemplate.value = null;
  templateErrors.value = {};
  templateForm.title = "";
  templateForm.message = "";
  templateModalOpen.value = true;
}

function editTemplate(template: SupportTemplate) {
  editingTemplate.value = template;
  templateErrors.value = {};
  templateForm.title = template.title;
  templateForm.message = template.message;
  templateModalOpen.value = true;
}

async function saveTemplate() {
  templateSaving.value = true;
  templateErrors.value = {};
  try {
    const { data } = editingTemplate.value
      ? await api.put<ApiEnvelope<SupportTemplate>>(`/superadmin/support/templates/${editingTemplate.value.id}`, templateForm)
      : await api.post<ApiEnvelope<SupportTemplate>>("/superadmin/support/templates", templateForm);

    const existingIndex = templates.value.findIndex((template) => template.id === data.data.id);
    if (existingIndex >= 0) templates.value.splice(existingIndex, 1, data.data);
    else templates.value.push(data.data);
    templates.value.sort((a, b) => a.title.localeCompare(b.title));
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

function viewBusiness(conversation: SupportConversation) {
  if (conversation.conversation_type === "guest") return;
  emit("openBusiness", conversation as unknown as AdminBusiness);
}

watch(() => props.initialBusiness, async (business) => {
  if (business && conversations.value.length) await selectInitialBusiness(business);
});

onMounted(async () => {
  try {
    await Promise.all([loadConversations(), loadTemplates()]);
    if (props.initialBusiness) await selectInitialBusiness(props.initialBusiness);
  } catch (e) {
    error.value = errorMessage(e);
  }
  refreshTimer = window.setInterval(refresh, 2000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Support</strong><small>{{ conversations.length }} conversations</small></div>
    </div>
    <div v-if="error" class="alert error">{{ error }}</div>
    <AdminSupportPanel
      ref="panel"
      v-model:reply="reply"
      :conversations="conversations"
      :selected="selected"
      :messages="messages"
      :templates="templates"
      :attachment="attachment"
      :saving="saving"
      :loading-older="loadingOlder"
      @select="selectConversation"
      @view-business="viewBusiness"
      @load-older="loadOlderMessages"
      @send="sendReply"
      @download="downloadAttachment"
      @choose-attachment="chooseAttachment"
      @clear-attachment="attachment = null"
      @use-template="applyTemplate"
      @add-template="addTemplate"
      @edit-template="editTemplate"
    />
  </div>

  <div v-if="templateModalOpen" class="modal-backdrop" @click.self="templateModalOpen = false">
    <form class="modal template-modal" @submit.prevent="saveTemplate">
      <div class="modal-head">
        <div><h2>{{ editingTemplate ? "Edit" : "Add" }} message template</h2><p>{{ editingTemplate ? "Update this reusable support reply." : "Create a reusable Super Admin support reply." }}</p></div>
        <button type="button" class="icon-btn" @click="templateModalOpen = false"><X /></button>
      </div>
      <div class="field-grid">
        <label class="full">Template name<input v-model="templateForm.title" maxlength="100" required /><small v-if="templateErrors.title">{{ templateErrors.title[0] }}</small></label>
        <label class="full">Message<textarea v-model="templateForm.message" maxlength="5000" rows="6" required></textarea><small v-if="templateErrors.message">{{ templateErrors.message[0] }}</small><small>Use <code v-pre>{{dashboard_url}}</code> to insert the dashboard link.</small></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="templateModalOpen = false">Cancel</button>
        <button class="btn btn-primary" :disabled="templateSaving">{{ templateSaving ? "Saving..." : editingTemplate ? "Save changes" : "Create template" }}</button>
      </div>
    </form>
  </div>
</template>
