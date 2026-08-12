<script setup lang="ts">
import { MessageCircle, Pencil } from "lucide-vue-next";
import StatusBadge from "../StatusBadge.vue";
import type { AdminBusiness } from "../../types/admin";

defineProps<{ businesses: AdminBusiness[] }>();

const emit = defineEmits<{
  edit: [business: AdminBusiness];
  support: [business: AdminBusiness];
  view: [business: AdminBusiness];
}>();
</script>

<template>
  <table>
    <thead><tr><th>Business</th><th>Owner</th><th>Users</th><th>Vehicles</th><th>Plan</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      <tr v-for="business in businesses" :key="business.id">
        <td><button type="button" class="business-name-link" @click="emit('view', business)">{{ business.name }}</button><small class="cell-small">{{ business.email }}</small></td>
        <td>{{ business.users?.[0]?.name || "-" }}<small class="cell-small">{{ business.users?.[0]?.email }}</small></td>
        <td>{{ business.users_count }}</td>
        <td>{{ business.vehicles_count }} / {{ business.subscription?.vehicle_limit }}</td>
        <td class="capitalize">{{ business.subscription?.label || business.subscription_plan }}</td>
        <td><StatusBadge :status="business.status === 'inactive' ? 'inactive' : business.subscription_status" /></td>
        <td><span class="row-actions"><button class="icon-btn" title="Open support chat" aria-label="Open support chat" @click="emit('support', business)"><MessageCircle /></button><button class="icon-btn" title="Edit business" aria-label="Edit business" @click="emit('edit', business)"><Pencil /></button></span></td>
      </tr>
    </tbody>
  </table>
</template>
