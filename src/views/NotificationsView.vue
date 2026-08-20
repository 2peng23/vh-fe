<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { CheckCheck, FileClock, Wrench } from "lucide-vue-next";
import api from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDateTime } from "../utils";
import { useAuthStore } from "../stores/auth";
const router = useRouter(),
  auth = useAuthStore(),
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
  window.dispatchEvent(new Event("vehiclehub-notifications-changed"));
}
async function read(n: any) {
  if (n.read_at) return;
  await api.post(`/notifications/${n.id}/read`);
  n.read_at = new Date().toISOString();
  window.dispatchEvent(new Event("vehiclehub-notifications-changed"));
}
function targetTab(n: any) {
  const title = String(n.data?.title || "").toLowerCase();
  const message = String(n.data?.message || "").toLowerCase();

  if (title.includes("document") || message.includes("registration")) return "documents";
  if (title.includes("issue") || message.includes("warning light")) return "issues";
  if (title.includes("maintenance") || message.includes("schedule")) return "schedules";

  return "overview";
}
async function openNotification(n: any) {
  if (auth.can("notifications.update")) {
    try {
      await read(n);
    } catch {
      // Navigation should still work even if marking the notification as read fails.
    }
  }

  if (n.data?.vehicle_id) {
    await router.push({
      path: `/vehicles/${n.data.vehicle_id}`,
      query: { tab: targetTab(n) },
    });
  }
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
      ><button
        v-if="items.length && auth.can('notifications.update')"
        class="btn"
        @click="readAll"
      >
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
        type="button"
        class="notification-row"
        :class="{ unread: !n.read_at }"
        @click="openNotification(n)"
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
