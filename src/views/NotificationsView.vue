<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { CheckCheck, FileClock, Wrench } from "lucide-vue-next";
import api from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDateTime } from "../utils/date";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore(),
  items = ref<any[]>([]),
  loading = ref(true),
  meta = ref<PaginationMeta>(),
  page = ref(1),
  perPage = ref(20);
async function load() {
  loading.value = true;
  const { data } = await api.get<ApiEnvelope<any[]>>("/notifications", {
    params: { page: page.value, per_page: perPage.value },
  });
  items.value = data.data;
  meta.value = data.meta;
  loading.value = false;
}
async function readAll() {
  await api.post("/notifications/read-all");
  items.value.forEach((n) => (n.read_at = new Date().toISOString()));
}
async function read(n: any) {
  if (n.read_at) return;
  await api.post(`/notifications/${n.id}/read`);
  n.read_at = new Date().toISOString();
}
onMounted(load);
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
</script>
<template>
  <div>
    <PageHeader
      title="Notifications"
      description="Vehicle reminders and updates that need your attention."
      ><button v-if="auth.can('notifications.update')" class="btn" @click="readAll">
        <CheckCheck />Mark all as read
      </button></PageHeader
    ><LoadingState v-if="loading" /><EmptyState
      v-else-if="!items.length"
      title="You’re all caught up"
      message="New vehicle reminders will appear here."
    />
    <div v-else class="notification-list">
      <button
        v-for="n in items"
        :key="n.id"
        class="notification-row"
        :class="{ unread: !n.read_at }"
        @click="auth.can('notifications.update') && read(n)"
      >
        <span
          class="metric-icon"
          :class="n.data?.title?.includes('document') ? 'violet' : 'amber'"
          ><FileClock v-if="n.data?.title?.includes('document')" /><Wrench
            v-else
        /></span>
        <div>
          <strong>{{ n.data?.title || "Vehicle notification" }}</strong>
          <p>{{ n.data?.message }}</p>
          <small>{{ formatDateTime(n.created_at) }}</small>
        </div>
        <i v-if="!n.read_at"></i>
      </button>
      <PaginationControls
        v-if="meta"
        :meta="meta"
        v-model:page="page"
        v-model:per-page="perPage"
      />
    </div>
  </div>
</template>
