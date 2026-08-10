<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import {
  Building2,
  CarFront,
  ChevronDown,
  ChevronRight,
  LogOut,
  Pencil,
  ShieldCheck,
  Users,
  X,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import api, { errorMessage } from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ApiEnvelope, PaginationMeta } from "../types";
import AppLogo from "../components/AppLogo.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { formatDate } from "../utils/date";

const auth = useAuthStore(),
  router = useRouter(),
  tab = ref<"businesses" | "users" | "permissions">("businesses"),
  stats = ref<any>({}),
  rows = ref<any[]>([]),
  meta = ref<PaginationMeta>(),
  loading = ref(true),
  error = ref(""),
  search = ref(""),
  page = ref(1),
  perPage = ref(20),
  editing = ref<any | null>(null),
  saving = ref(false),
  permissionData = ref<any>({ modules: {}, roles: [] }),
  selectedRole = ref("owner"),
  selectedPermissions = ref<string[]>([]),
  expandedOwners = ref<Set<number>>(new Set());
const form = reactive<Record<string, any>>({});
async function loadStats() {
  const { data } = await api.get<ApiEnvelope<any>>("/superadmin/dashboard");
  stats.value = data.data;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    if (tab.value === "permissions") {
      const { data } = await api.get<ApiEnvelope<any>>("/superadmin/permissions");
      permissionData.value = data.data;
      const role = data.data.roles.find((item: any) => item.name === selectedRole.value) || data.data.roles[0];
      selectedRole.value = role?.name || "owner";
      selectedPermissions.value = [...(role?.permissions || [])];
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
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function selectTab(value: "businesses" | "users" | "permissions") {
  tab.value = value;
  page.value = 1;
  load();
}
function selectRole(role: string) {
  selectedRole.value = role;
  const item = permissionData.value.roles.find((entry: any) => entry.name === role);
  selectedPermissions.value = [...(item?.permissions || [])];
}
function toggleOwner(ownerId: number) {
  const next = new Set(expandedOwners.value);
  next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId);
  expandedOwners.value = next;
}
async function savePermissions() {
  saving.value = true;
  error.value = "";
  try {
    await api.put(`/superadmin/permissions/${selectedRole.value}`, { permissions: selectedPermissions.value });
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
      trial_ends_at: row.trial_ends_at?.slice(0, 10) || "",
    });
  else
    Object.assign(form, {
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      password: "",
      password_confirmation: "",
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
async function logout() {
  await auth.logout();
  router.push("/login");
}
onMounted(async () => {
  try {
    await Promise.all([loadStats(), load()]);
  } catch (e) {
    error.value = errorMessage(e);
  }
});
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
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
      </div>
      <div class="superadmin-stats">
        <article>
          <Building2 /><small>Businesses</small
          ><strong>{{ stats.businesses || 0 }}</strong>
        </article>
        <article>
          <ShieldCheck /><small>Active / Trial</small
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
          </div>
          <div v-if="tab !== 'permissions'" class="superadmin-search">
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
        <LoadingState v-if="loading" /><div v-else-if="tab === 'permissions'" class="permission-editor">
          <div class="toolbar permission-toolbar">
            <label>Role<select :value="selectedRole" @change="selectRole(($event.target as HTMLSelectElement).value)">
              <option v-for="role in permissionData.roles" :key="role.name" :value="role.name">
                {{ role.name.replaceAll('_', ' ') }} ({{ role.users_count }} users)
              </option>
            </select></label>
            <button class="btn btn-primary" :disabled="saving" @click="savePermissions">
              {{ saving ? 'Saving…' : 'Save permissions' }}
            </button>
          </div>
          <div class="table-wrap"><table><thead><tr><th>Module</th><th v-for="action in ['view','create','update','delete','export','override']" :key="action">{{ action }}</th></tr></thead>
            <tbody><tr v-for="(actions, module) in permissionData.modules" :key="module">
              <td class="capitalize"><strong>{{ String(module).replaceAll('_', ' ') }}</strong></td>
              <td v-for="action in ['view','create','update','delete','export','override']" :key="action">
                <input v-if="actions.includes(action)" v-model="selectedPermissions" type="checkbox" :value="`${module}.${action}`" />
                <span v-else>—</span>
              </td>
            </tr></tbody></table></div>
          <p class="permission-note">Changes apply immediately to every owner or staff member assigned to this role. Super Admin always retains full access.</p>
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
                <td>{{ row.vehicles_count }}</td>
                <td class="capitalize">{{ row.subscription_plan }}</td>
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
                    role="button"
                    tabindex="0"
                    :aria-expanded="expandedOwners.has(owner.id)"
                    @click="toggleOwner(owner.id)"
                    @keydown.enter.prevent="toggleOwner(owner.id)"
                    @keydown.space.prevent="toggleOwner(owner.id)"
                  >
                    <span class="owner-toggle">
                      <ChevronDown v-if="expandedOwners.has(owner.id)" />
                      <ChevronRight v-else />
                      <span>
                        <strong>{{ owner.name }}</strong>
                        <small class="cell-small">{{ owner.email }}</small>
                      </span>
                    </span>
                  </td>
                  <td>{{ owner.business?.name || "—" }}</td>
                  <td class="capitalize">{{ owner.role.replaceAll("_", " ") }}</td>
                  <td><StatusBadge :status="owner.status" /></td>
                  <td>{{ formatDate(owner.created_at) }}</td>
                  <td>
                    <button class="icon-btn" @click="edit(owner)"><Pencil /></button>
                  </td>
                </tr>
                <tr
                  v-for="staff in expandedOwners.has(owner.id) ? (owner.business?.users || []) : []"
                  :key="staff.id"
                  class="staff-row"
                >
                  <td>
                    <span class="staff-cell">
                      <span>
                        <strong>{{ staff.name }}</strong>
                        <small class="cell-small">{{ staff.email }}</small>
                      </span>
                    </span>
                  </td>
                  <td>{{ owner.business?.name || "—" }}</td>
                  <td class="capitalize">{{ staff.role.replaceAll("_", " ") }}</td>
                  <td><StatusBadge :status="staff.status" /></td>
                  <td>{{ formatDate(staff.created_at) }}</td>
                  <td>
                    <button class="icon-btn" @click="edit(staff)"><Pencil /></button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <PaginationControls
          v-if="meta && tab !== 'permissions'"
          :meta="meta"
          v-model:page="page"
          v-model:per-page="perPage"
        />
      </div>
    </main>
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
              <option>starter</option>
              <option>business</option>
              <option>enterprise</option>
            </select></label
          ><label
            >Status<select v-model="form.subscription_status">
              <option>trial</option>
              <option>active</option>
              <option>past_due</option>
              <option>suspended</option>
              <option>cancelled</option>
            </select></label
          ><label
            >Trial ends<input v-model="form.trial_ends_at" type="date"
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
