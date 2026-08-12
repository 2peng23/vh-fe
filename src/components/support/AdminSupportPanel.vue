<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { Download, MessageCircle, Paperclip, Pencil, Plus, Send, X } from "lucide-vue-next";
import StatusBadge from "../StatusBadge.vue";
import type { SupportConversation, SupportMessage, SupportTemplate } from "../../types/support";
import { formatDateTime } from "../../utils/date";

const props = defineProps<{
  conversations: SupportConversation[];
  selected: SupportConversation | null;
  messages: SupportMessage[];
  templates: SupportTemplate[];
  reply: string;
  attachment: File | null;
  saving: boolean;
  loadingOlder: boolean;
}>();

const emit = defineEmits<{
  select: [conversation: SupportConversation];
  viewBusiness: [conversation: SupportConversation];
  loadOlder: [];
  send: [];
  download: [message: SupportMessage];
  chooseAttachment: [event: Event];
  clearAttachment: [];
  useTemplate: [message: string];
  addTemplate: [];
  editTemplate: [template: SupportTemplate];
  "update:reply": [value: string];
}>();

const attachmentInput = ref<HTMLInputElement>();
const thread = ref<HTMLElement>();

/** Move the internal thread viewport to the latest message. */
async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (thread.value) thread.value.scrollTop = thread.value.scrollHeight;
}

/** Expose the thread element for cursor pagination scroll preservation. */
function threadElement(): HTMLElement | undefined {
  return thread.value;
}

defineExpose({ scrollToBottom, threadElement });

/** Clear the native input whenever the parent removes or sends the selected file. */
watch(() => props.attachment, (attachment) => {
  if (!attachment && attachmentInput.value) attachmentInput.value.value = "";
});

/** Create a stable key because guest and business identifiers can overlap. */
function conversationKey(conversation: SupportConversation): string {
  return `${conversation.conversation_type}-${conversation.id}`;
}

/** Request older messages when the internal thread reaches its upper boundary. */
function handleThreadScroll(event: Event): void {
  if ((event.currentTarget as HTMLElement).scrollTop <= 20) emit("loadOlder");
}

/** Convert attachment bytes into a compact display value. */
function fileSize(bytes: number | null): string {
  if (!bytes) return "";
  return bytes < 1048576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Split message text into plain and link segments without injecting HTML. */
function messageParts(value: string | null) {
  return String(value || "").split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((text) => ({ text, url: /^https?:\/\//.test(text) }));
}
</script>

<template>
  <div class="support-admin">
    <aside class="support-conversations">
      <div class="support-section-title"><strong>Support messages</strong><small>{{ conversations.length }} conversations</small></div>
      <button v-for="conversation in conversations" :key="conversationKey(conversation)" :class="{ active: selected && conversationKey(selected) === conversationKey(conversation), unread: conversation.unread_support_count > 0 }" @click="emit('select', conversation)">
        <span><span class="conversation-title"><strong>{{ conversation.name }}</strong><em v-if="conversation.conversation_type === 'guest'" class="guest-label">Guest</em><em v-if="conversation.unread_support_count" class="conversation-unread-count">{{ conversation.unread_support_count > 99 ? '99+' : conversation.unread_support_count }}</em></span><small>{{ conversation.email }}</small></span>
      </button>
      <p v-if="!conversations.length" class="support-empty">No support messages yet.</p>
    </aside>

    <section class="support-admin-thread">
      <template v-if="selected">
        <header><div><button type="button" class="support-business-link" :class="{ disabled: selected.conversation_type === 'guest' }" :title="selected.conversation_type === 'guest' ? 'Guest conversation' : 'View business'" @click="emit('viewBusiness', selected)">{{ selected.name }}</button><small>{{ selected.email }}</small></div><StatusBadge v-if="selected.subscription_status" :status="selected.subscription_status" /><span v-else class="guest-label">Guest</span></header>
        <div ref="thread" class="support-thread" @scroll="handleThreadScroll">
          <p v-if="loadingOlder" class="support-history-loading">Loading earlier messages...</p>
          <article v-for="item in messages" :key="item.id" :class="['support-bubble', item.sender_type === 'super_admin' ? 'mine' : 'theirs']">
            <p v-if="item.message"><template v-for="(part, index) in messageParts(item.message)" :key="index"><a v-if="part.url" :href="part.text" target="_blank" rel="noopener">{{ part.text }}</a><span v-else>{{ part.text }}</span></template></p>
            <button v-if="item.attachment_name" type="button" class="support-attachment" @click="emit('download', item)"><Paperclip /><span><strong>{{ item.attachment_name }}</strong><small>{{ fileSize(item.attachment_size) }}</small></span><Download /></button>
            <small>{{ formatDateTime(item.created_at) }}<template v-if="item.sender_type === 'super_admin'"> · {{ item.read_at ? 'Read' : 'Sent' }}</template></small>
          </article>
        </div>
        <form class="support-composer" @submit.prevent="emit('send')"><div class="support-compose-main"><textarea :value="reply" maxlength="5000" placeholder="Reply to this conversation..." @input="emit('update:reply', ($event.target as HTMLTextAreaElement).value)"></textarea><span v-if="attachment" class="selected-attachment"><Paperclip />{{ attachment.name }}<button type="button" @click="emit('clearAttachment')"><X /></button></span></div><label class="icon-btn attachment-picker" title="Attach file"><Paperclip /><input ref="attachmentInput" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" @change="emit('chooseAttachment', $event)" /></label><button class="btn btn-primary" :disabled="saving || (!reply.trim() && !attachment)"><Send />Reply</button></form>
      </template>
      <div v-else class="support-empty"><MessageCircle /><strong>Select a conversation</strong></div>
    </section>

    <aside class="support-templates-panel">
      <div class="support-section-title template-panel-head"><span><strong>Message templates</strong><small>Click to use a quick reply</small></span><button type="button" class="icon-btn" title="Add message template" @click="emit('addTemplate')"><Plus /></button></div>
      <div class="support-template-list"><article v-for="template in templates" :key="template.id" class="support-template-card"><button type="button" class="support-template-use" :disabled="!selected" @click="emit('useTemplate', template.message)"><strong>{{ template.title }}</strong><span>{{ template.message }}</span></button><button type="button" class="support-template-edit" :aria-label="`Edit ${template.title}`" title="Edit template" @click="emit('editTemplate', template)"><Pencil /></button></article></div>
    </aside>
  </div>
</template>
