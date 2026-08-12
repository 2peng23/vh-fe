<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Download, LifeBuoy, Paperclip, Send, X } from "lucide-vue-next";
import AppLogo from "../components/AppLogo.vue";
import api, { errorMessage } from "../api/client";
import { useAuthStore } from "../stores/auth";
import { formatDate } from "../utils/date";

const auth = useAuthStore();
const props = defineProps<{ embedded?: boolean; guest?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const messages = ref<any[]>([]);
const message = ref("");
const loading = ref(true);
const sending = ref(false);
const error = ref("");
const attachment = ref<File | null>(null);
const attachmentInput = ref<HTMLInputElement>();
const thread = ref<HTMLElement>();
const hasMore = ref(false);
const loadingOlder = ref(false);
let refreshTimer: number;
let refreshing = false;
const guestToken = ref(localStorage.getItem("vehiclehub_guest_support_token") || "");
const guestProfile = reactive({
  name: localStorage.getItem("vehiclehub_guest_support_name") || "",
  email: localStorage.getItem("vehiclehub_guest_support_email") || "",
});
const hasConversation = computed(() => !props.guest || !!guestToken.value);
const supportPath = computed(() => props.guest ? "/guest-support/messages" : "/support/messages");
const guestHeaders = () => props.guest ? { "X-Support-Token": guestToken.value } : {};

async function startGuestConversation() {
  sending.value = true;
  error.value = "";
  try {
    const { data } = await api.post("/guest-support/conversations", guestProfile);
    guestToken.value = data.data.token;
    localStorage.setItem("vehiclehub_guest_support_token", data.data.token);
    localStorage.setItem("vehiclehub_guest_support_name", guestProfile.name);
    localStorage.setItem("vehiclehub_guest_support_email", guestProfile.email);
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    sending.value = false;
  }
}

async function scrollToBottom() {
  await nextTick();
  window.requestAnimationFrame(() => {
    if (thread.value) thread.value.scrollTop = thread.value.scrollHeight;
  });
}
async function load() {
  if (!hasConversation.value) { loading.value = false; return; }
  if (refreshing) return;
  refreshing = true;
  try {
    const { data } = await api.get(supportPath.value, { headers: guestHeaders() });
    const previousLastId = messages.value.at(-1)?.id;
    const nextLastId = data.data.at(-1)?.id;
    const merged = new Map(messages.value.map((item) => [item.id, item]));
    data.data.forEach((item: any) => merged.set(item.id, item));
    messages.value = [...merged.values()].sort((a, b) => a.id - b.id);
    if (!messages.value.length || data.data[0]?.id <= messages.value[0]?.id) hasMore.value = data.meta?.has_more || false;
    if (previousLastId !== nextLastId) await scrollToBottom();
  } catch (e) {
    if (props.guest && [401, 404].includes((e as any)?.response?.status)) {
      guestToken.value = "";
      localStorage.removeItem("vehiclehub_guest_support_token");
      error.value = "Your previous support session is no longer available. Please start a new conversation.";
      return;
    }
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
    refreshing = false;
  }
}
async function loadOlder() {
  if (loadingOlder.value || !hasMore.value || !messages.value.length) return;
  loadingOlder.value = true;
  const element = thread.value;
  const previousHeight = element?.scrollHeight || 0;
  try {
    const { data } = await api.get(supportPath.value, { params: { before_id: messages.value[0].id }, headers: guestHeaders() });
    messages.value = [...data.data, ...messages.value];
    hasMore.value = data.meta?.has_more || false;
    await nextTick();
    if (element) element.scrollTop += element.scrollHeight - previousHeight;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loadingOlder.value = false;
  }
}
function handleThreadScroll() {
  if ((thread.value?.scrollTop || 0) <= 20) loadOlder();
}
async function send() {
  const text = message.value.trim();
  if (!text && !attachment.value) return;
  sending.value = true;
  error.value = "";
  try {
    const payload = new FormData();
    if (text) payload.append("message", text);
    if (attachment.value) payload.append("attachment", attachment.value);
    const { data } = await api.post(supportPath.value, payload, { headers: guestHeaders() });
    messages.value.push(data.data);
    message.value = "";
    attachment.value = null;
    if (attachmentInput.value) attachmentInput.value.value = "";
    await scrollToBottom();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    sending.value = false;
  }
}
function chooseAttachment(event: Event) {
  attachment.value = (event.target as HTMLInputElement).files?.[0] || null;
}
async function downloadAttachment(item: any) {
  const path = props.guest ? `/guest-support/attachments/${item.id}` : `/support/attachments/${item.id}`;
  const response = await api.get(path, { responseType: "blob", headers: guestHeaders() });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.attachment_name;
  link.click();
  URL.revokeObjectURL(url);
}
function fileSize(bytes: number) {
  return bytes < 1048576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
function messageParts(value: string) {
  return String(value || "").split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((text) => ({ text, url: /^https?:\/\//.test(text) }));
}
onMounted(async () => {
  await load();
  refreshTimer = window.setInterval(load, 2000);
});
onBeforeUnmount(() => clearInterval(refreshTimer));
</script>

<template>
  <main class="support-page" :class="{ embedded }">
    <section class="support-chat-card">
      <header class="support-chat-head">
        <AppLogo />
        <div><LifeBuoy /><span><strong>Vehicle Hub Support</strong><small>{{ guest ? (guestProfile.email || 'Guest support') : auth.user?.business?.name }}</small></span></div>
        <button v-if="embedded" type="button" class="icon-btn support-close" aria-label="Close support chat" @click="emit('close')"><X /></button>
      </header>
      <form v-if="guest && !hasConversation" class="guest-support-start" @submit.prevent="startGuestConversation">
        <LifeBuoy /><h2>Contact support</h2><p>Enter your details to start a private conversation. This browser will remember your chat.</p>
        <label>Name<input v-model="guestProfile.name" required maxlength="100" autocomplete="name" /></label>
        <label>Email address<input v-model="guestProfile.email" required type="email" autocomplete="email" /></label>
        <div v-if="error" class="alert error">{{ error }}</div>
        <button class="btn btn-primary btn-block" :disabled="sending">{{ sending ? 'Starting…' : 'Start conversation' }}</button>
      </form>
      <div v-else ref="thread" class="support-thread" @scroll="handleThreadScroll">
        <p v-if="loadingOlder" class="support-history-loading">Loading earlier messages…</p>
        <p v-if="loading" class="support-empty">Loading conversation…</p>
        <div v-else-if="!messages.length" class="support-empty"><LifeBuoy /><strong>How can we help?</strong><span>Send a message and the Vehicle Hub support team will reply here.</span></div>
        <article v-for="item in messages" :key="item.id" :class="['support-bubble', ['tenant', 'guest'].includes(item.sender_type) ? 'mine' : 'theirs']">
          <p v-if="item.message"><template v-for="(part, index) in messageParts(item.message)" :key="index"><a v-if="part.url" :href="part.text" target="_blank" rel="noopener">{{ part.text }}</a><span v-else>{{ part.text }}</span></template></p>
          <button v-if="item.attachment_name" type="button" class="support-attachment" @click="downloadAttachment(item)"><Paperclip /><span><strong>{{ item.attachment_name }}</strong><small>{{ fileSize(item.attachment_size) }}</small></span><Download /></button>
          <small>{{ formatDate(item.created_at) }}</small>
        </article>
      </div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <form v-if="hasConversation" class="support-composer" @submit.prevent="send">
        <div class="support-compose-main"><textarea v-model="message" maxlength="5000" placeholder="Type your message to support…"></textarea><span v-if="attachment" class="selected-attachment"><Paperclip />{{ attachment.name }}<button type="button" @click="attachment = null"><X /></button></span></div>
        <label class="icon-btn attachment-picker" title="Attach file"><Paperclip /><input ref="attachmentInput" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" @change="chooseAttachment" /></label>
        <button class="btn btn-primary" :disabled="sending || (!message.trim() && !attachment)"><Send />{{ sending ? "Sending…" : "Send" }}</button>
      </form>
    </section>
  </main>
</template>
