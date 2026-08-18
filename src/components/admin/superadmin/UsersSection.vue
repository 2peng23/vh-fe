<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { ChevronDown, ChevronRight, Pencil, ShieldCheck, X } from "lucide-vue-next";
import { useRouter } from "vue-router";
import api, { errorMessage } from "../../../api/client";
import { useAuthStore } from "../../../stores/auth";
import type { ApiEnvelope, PaginationMeta } from "../../../types";
import type { AdminBusiness, AdminUser } from "../../../types/admin";
import { formatDate } from "../../../utils";
import EmptyState from "../../EmptyState.vue";
import LoadingState from "../../LoadingState.vue";
import PaginationControls from "../../PaginationControls.vue";
import StatusBadge from "../../StatusBadge.vue";

const emit = defineEmits<{
  openBusiness: [business: AdminBusiness];
  openPermissions: [userId: number];
}>();

const auth = useAuthStore();
const router = useRouter();
const rows = ref<AdminUser[]>([]);
const meta = ref<PaginationMeta>();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const search = ref("");
const page = ref(1);
const perPage = ref(20);
const editing = ref<AdminUser | null>(null);
const impersonatingUserId = ref<number | null>(null);
const expandedOwners = ref<Set<number>>(new Set());
const form = reactive<Record<string, string | number | undefined>>({});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AdminUser[]>>("/superadmin/users", {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    });
    rows.value = data.data;
    expandedOwners.value = search.value.trim()
      ? new Set(data.data.map((owner) => owner.id))
      : new Set();
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function runSearch() {
  page.value = 1;
  load();
}

function toggleOwner(ownerId: number) {
  const next = new Set(expandedOwners.value);
  next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId);
  expandedOwners.value = next;
}

function visibleStaff(owner: AdminUser) {
  const staff = (owner.business?.users || []) as AdminUser[];
  const term = search.value.trim().toLowerCase();
  if (!term) return staff;
  return staff.filter((user: AdminUser) =>
    [user.name, user.email].some((value) => String(value || "").toLowerCase().includes(term)),
  );
}

async function openUserDashboard(userId: number) {
  impersonatingUserId.value = userId;
  error.value = "";
  try {
    await auth.impersonate(userId);
    await router.push("/dashboard");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    impersonatingUserId.value = null;
  }
}

function editUser(row: AdminUser) {
  editing.value = row;
  Object.keys(form).forEach((key) => delete form[key]);
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

async function saveUser() {
  if (!editing.value) return;
  saving.value = true;
  error.value = "";
  const payload = { ...form };
  if (!payload.password) {
    delete payload.password;
    delete payload.password_confirmation;
  }

  try {
    await api.put(`/superadmin/users/${editing.value.id}`, payload);
    editing.value = null;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
onMounted(load);
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Users</strong><small>{{ meta?.total ?? rows.length }} records</small></div>
      <div class="superadmin-search">
        <input v-model="search" placeholder="Search users" @keyup.enter="runSearch" />
        <button class="btn btn-primary" @click="runSearch">Search</button>
      </div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" title="No users found" />
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>User</th><th>Business</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
        <tbody>
          <template v-for="owner in rows" :key="owner.id">
            <tr class="owner-row">
              <td class="owner-cell">
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
              <td><button v-if="owner.business" type="button" class="business-name-link" @click="emit('openBusiness', owner.business)">{{ owner.business.name }}</button><span v-else>—</span></td>
              <td class="capitalize">{{ owner.role.replaceAll("_", " ") }}</td>
              <td><StatusBadge :status="owner.status" /></td>
              <td>{{ formatDate(owner.created_at) }}</td>
              <td>
                <span class="row-actions">
                  <button class="icon-btn" title="Edit permissions" aria-label="Edit permissions" @click="emit('openPermissions', owner.id)"><ShieldCheck /></button>
                  <button class="icon-btn" title="Edit user" aria-label="Edit user" @click="editUser(owner)"><Pencil /></button>
                </span>
              </td>
            </tr>

            <tr
              v-for="staff in expandedOwners.has(owner.id) ? visibleStaff(owner) : []"
              :key="staff.id"
              class="staff-row"
            >
              <td>
                <span class="staff-cell"><span>
                  <button class="user-dashboard-link" :disabled="impersonatingUserId === staff.id" @click="openUserDashboard(staff.id)">{{ staff.name }}</button>
                  <small class="cell-small">{{ staff.email }}</small>
                </span></span>
              </td>
              <td><button v-if="owner.business" type="button" class="business-name-link" @click="emit('openBusiness', owner.business)">{{ owner.business.name }}</button><span v-else>—</span></td>
              <td class="capitalize">{{ staff.role.replaceAll("_", " ") }}</td>
              <td><StatusBadge :status="staff.status" /></td>
              <td>{{ formatDate(staff.created_at) }}</td>
              <td>
                <span class="row-actions">
                  <button class="icon-btn" title="Edit permissions" aria-label="Edit permissions" @click="emit('openPermissions', staff.id)"><ShieldCheck /></button>
                  <button class="icon-btn" title="Edit user" aria-label="Edit user" @click="editUser(staff)"><Pencil /></button>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <PaginationControls v-if="meta" v-model:page="page" v-model:per-page="perPage" :meta="meta" />
  </div>

  <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
    <form class="modal" @submit.prevent="saveUser">
      <div class="modal-head">
        <div><h2>Edit user</h2><p>Platform-level account management</p></div>
        <button type="button" class="icon-btn" @click="editing = null"><X /></button>
      </div>
      <div class="field-grid">
        <label>Name<input v-model="form.name" required /></label>
        <label>Email<input v-model="form.email" type="email" required /></label>
        <label>Role<select v-model="form.role"><option>owner</option><option>staff</option></select></label>
        <label>Status<select v-model="form.status"><option>active</option><option>inactive</option></select></label>
        <label>Password<input v-model="form.password" type="password" autocomplete="new-password" /><small>Leave blank to keep current password</small></label>
        <label v-if="form.role === 'owner'">Custom vehicle limit<input v-model.number="form.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Leave blank to use this owner’s plan limit.</small></label>
        <label>Confirm password<input v-model="form.password_confirmation" type="password" autocomplete="new-password" /></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="editing = null">Cancel</button>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving…" : "Save changes" }}</button>
      </div>
    </form>
  </div>
</template>
