<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronDown, Search } from "lucide-vue-next";
import api, { errorMessage } from "../../../api/client";
import type { ApiEnvelope } from "../../../types";
import type { AdminPermissionAction, AdminUser, PermissionData } from "../../../types/admin";
import ConfirmDeleteModal from "../../ConfirmDeleteModal.vue";
import LoadingState from "../../LoadingState.vue";

const props = defineProps<{ initialUserId?: number | null }>();

const permissionData = ref<PermissionData>({ modules: {} });
const selectedPermissionUserId = ref<number | null>(null);
const selectedPermissionUser = ref<AdminUser | null>(null);
const permissionUserOptions = ref<AdminUser[]>([]);
const permissionUserTotal = ref(0);
const permissionUserSearch = ref("");
const permissionUserPickerOpen = ref(false);
const permissionUserSearchLoading = ref(false);
const selectedPermissions = ref<string[]>([]);
const bulkRole = ref<"owner" | "staff">("owner");
const bulkConfirmOpen = ref(false);
const bulkSaving = ref(false);
const saving = ref(false);
const loading = ref(true);
const error = ref("");
const actions: AdminPermissionAction[] = ["view", "create", "update", "delete", "export", "override"];
let permissionUserSearchTimer: number | undefined;

function selectPermissionUser(user: AdminUser) {
  selectedPermissionUserId.value = user.id;
  selectedPermissionUser.value = user;
  selectedPermissions.value = [...(user.permissions || [])];
  if (user.role === "owner" || user.role === "staff") bulkRole.value = user.role;
  permissionUserPickerOpen.value = false;
  permissionUserSearch.value = "";
}

async function loadPermissionUser(userId: number) {
  const { data } = await api.get<ApiEnvelope<AdminUser>>(`/superadmin/permissions/users/${userId}`);
  selectPermissionUser(data.data);
}

async function searchPermissionUsers(selectFirst = false) {
  permissionUserSearchLoading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<AdminUser[]>>("/superadmin/permissions/users", {
      params: { search: permissionUserSearch.value.trim(), per_page: 20 },
    });
    permissionUserOptions.value = data.data;
    permissionUserTotal.value = data.meta?.total || data.data.length;
    if (selectFirst && !selectedPermissionUserId.value && data.data[0]) selectPermissionUser(data.data[0]);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    permissionUserSearchLoading.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<PermissionData>>("/superadmin/permissions");
    permissionData.value = data.data;
    if (props.initialUserId) await loadPermissionUser(props.initialUserId);
    else if (selectedPermissionUserId.value) await loadPermissionUser(selectedPermissionUserId.value);
    else await searchPermissionUsers(true);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function queuePermissionUserSearch() {
  if (permissionUserSearchTimer) clearTimeout(permissionUserSearchTimer);
  permissionUserSearchTimer = window.setTimeout(() => searchPermissionUsers(), 250);
}

function openPermissionUserPicker() {
  permissionUserPickerOpen.value = !permissionUserPickerOpen.value;
  if (permissionUserPickerOpen.value) searchPermissionUsers();
}

async function savePermissions() {
  if (!selectedPermissionUserId.value) return;
  saving.value = true;
  error.value = "";
  try {
    await api.put(`/superadmin/permissions/users/${selectedPermissionUserId.value}`, {
      permissions: selectedPermissions.value,
    });
    await loadPermissionUser(selectedPermissionUserId.value);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
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
    if (selectedPermissionUserId.value) await loadPermissionUser(selectedPermissionUserId.value);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    bulkSaving.value = false;
  }
}

watch(() => props.initialUserId, async (userId) => {
  if (userId && userId !== selectedPermissionUserId.value) await loadPermissionUser(userId);
});

onMounted(load);
onBeforeUnmount(() => {
  if (permissionUserSearchTimer) clearTimeout(permissionUserSearchTimer);
});
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Permissions</strong><small>User-level access control</small></div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <div v-else class="permission-editor">
      <div class="toolbar permission-toolbar">
        <div class="permission-user-field">
          <label>User</label>
          <div class="permission-user-picker">
            <button type="button" class="permission-user-trigger" :aria-expanded="permissionUserPickerOpen" @click="openPermissionUserPicker">
              <span v-if="selectedPermissionUser">
                <strong>{{ selectedPermissionUser.name }}</strong>
                <small>{{ selectedPermissionUser.email }} · {{ selectedPermissionUser.business?.name || "No business" }} · {{ selectedPermissionUser.role }}</small>
              </span>
              <span v-else>Select a user</span>
              <ChevronDown />
            </button>

            <div v-if="permissionUserPickerOpen" class="permission-user-dropdown">
              <div class="permission-user-search">
                <Search />
                <input
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
                  <small>{{ user.email }} · {{ user.business?.name || "No business" }} · {{ user.role }}</small>
                </button>
              </div>
              <p v-else class="permission-user-state">No matching users found.</p>
              <small v-if="permissionUserTotal > permissionUserOptions.length" class="permission-user-hint">
                Showing {{ permissionUserOptions.length }} of {{ permissionUserTotal }} users. Type to narrow the results.
              </small>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" :disabled="saving || !selectedPermissionUserId" @click="savePermissions">
          {{ saving ? "Saving…" : "Save permissions" }}
        </button>

        <div class="permission-bulk">
          <label>User type<select v-model="bulkRole"><option value="owner">Owners</option><option value="staff">Staff</option></select></label>
          <button class="btn" :disabled="bulkSaving || !selectedPermissionUserId" @click="bulkConfirmOpen = true">Apply to all</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Module</th><th v-for="action in actions" :key="action">{{ action }}</th></tr></thead>
          <tbody>
            <tr v-for="(moduleActions, module) in permissionData.modules" :key="module">
              <td class="capitalize"><strong>{{ String(module).replaceAll("_", " ") }}</strong></td>
              <td v-for="action in actions" :key="action">
                <input v-if="moduleActions.includes(action)" v-model="selectedPermissions" type="checkbox" :value="`${module}.${action}`" />
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="permission-note">Changes apply only to the selected user. Other owners and staff keep their own permission settings. Super Admin always retains full access.</p>
    </div>
  </div>

  <ConfirmDeleteModal
    :open="bulkConfirmOpen"
    :loading="bulkSaving"
    title="Apply permissions to all users?"
    :message="`This will replace the individual permissions of every ${bulkRole} user with the currently checked permissions.`"
    confirm-label="Apply to all"
    @cancel="bulkConfirmOpen = false"
    @confirm="applyPermissionsToAll"
  />
</template>
