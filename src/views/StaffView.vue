<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal.vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore(),
  rows = ref<any[]>([]),
  meta = ref<PaginationMeta>(),
  loading = ref(true),
  saving = ref(false),
  error = ref(""),
  page = ref(1),
  perPage = ref(20),
  modal = ref(false),
  editing = ref<any | null>(null),
  pendingDelete = ref<any | null>(null),
  deleting = ref(false),
  showPassword = ref(false),
  showPasswordConfirmation = ref(false),
  errors = ref<Record<string, string[]>>({});
const form = reactive<Record<string, any>>({});
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>("/staff", {
      params: { page: page.value, per_page: perPage.value },
    });
    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function openForm(row?: any) {
  editing.value = row || null;
  errors.value = {};
  showPassword.value = false;
  showPasswordConfirmation.value = false;
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, {
    name: row?.name || "",
    email: row?.email || "",
    phone: row?.phone || "",
    role: row?.role || "staff",
    status: row?.status || "active",
    password: "",
    password_confirmation: "",
  });
  modal.value = true;
}
async function save() {
  saving.value = true;
  error.value = "";
  errors.value = {};
  const payload = { ...form };
  if (editing.value && !payload.password) {
    delete payload.password;
    delete payload.password_confirmation;
  }
  try {
    if (editing.value) await api.put(`/staff/${editing.value.id}`, payload);
    else await api.post("/staff", payload);
    modal.value = false;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
    errors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!pendingDelete.value) return;
  deleting.value = true;
  try {
    await api.delete(`/staff/${pendingDelete.value.id}`);
    pendingDelete.value = null;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    deleting.value = false;
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
      title="Staff management"
      description="Add up to three people to help operate your vehicle."
      ><button
        v-if="auth.can('staff.create')"
        class="btn btn-primary"
        :disabled="(meta?.total || 0) >= 3"
        @click="openForm()"
      >
        <Plus />Add staff
      </button></PageHeader
    >
    <div v-if="(meta?.total || 0) >= 3" class="alert staff-limit">
      Your 3 staff account limit has been reached.
    </div>
    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" /><EmptyState
      v-else-if="!rows.length"
      title="No staff accounts"
      message="Add your first staff member to help manage the vehicle."
    />
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <strong>{{ row.name }}</strong>
              </td>
              <td>{{ row.email }}</td>
              <td>{{ row.phone || "—" }}</td>
              <td class="capitalize">{{ row.role.replaceAll("_", " ") }}</td>
              <td><StatusBadge :status="row.status" /></td>
              <td>
                <div class="row-actions">
                  <button
                    v-if="auth.can('staff.update')"
                    class="icon-btn"
                    title="Edit staff"
                    @click="openForm(row)"
                  >
                    <Pencil /></button
                  ><button
                    v-if="auth.can('staff.delete')"
                    class="icon-btn danger"
                    title="Remove staff"
                    @click="pendingDelete = row"
                  >
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls
        v-if="meta"
        :meta="meta"
        v-model:page="page"
        v-model:per-page="perPage"
      />
    </div>
    <div v-if="modal" class="modal-backdrop" @click.self="modal = false">
      <form class="modal" @submit.prevent="save">
        <div class="modal-head">
          <div>
            <h2>{{ editing ? "Edit" : "Add" }} staff account</h2>
            <p>Choose the access level appropriate for this person.</p>
          </div>
          <button type="button" class="icon-btn" @click="modal = false">
            <X />
          </button>
        </div>
        <div class="field-grid">
          <label
            >Name<input v-model="form.name" required /><small
              v-if="errors.name"
              >{{ errors.name[0] }}</small
            ></label
          ><label
            >Email<input v-model="form.email" type="email" required /><small
              v-if="errors.email"
              >{{ errors.email[0] }}</small
            ></label
          ><label>Phone<input v-model="form.phone" /></label
          ><label
            >Status<select v-model="form.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select></label
          ><label
            >Password
            <div class="password-field">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!editing"
                autocomplete="new-password"
              /><button
                type="button"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :title="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" /><Eye v-else />
              </button>
            </div>
            <small v-if="editing"
              >Leave blank to keep current password</small
            ></label
          ><label
            >Password confirmation
            <div class="password-field">
              <input
                v-model="form.password_confirmation"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                :required="!editing"
                autocomplete="new-password"
              /><button
                type="button"
                :aria-label="
                  showPasswordConfirmation
                    ? 'Hide password confirmation'
                    : 'Show password confirmation'
                "
                :title="
                  showPasswordConfirmation
                    ? 'Hide password confirmation'
                    : 'Show password confirmation'
                "
                @click="showPasswordConfirmation = !showPasswordConfirmation"
              >
                <EyeOff v-if="showPasswordConfirmation" /><Eye v-else />
              </button>
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modal = false">
            Cancel</button
          ><button class="btn btn-primary" :disabled="saving">
            {{ saving ? "Saving…" : "Save staff" }}
          </button>
        </div>
      </form>
    </div>
    <ConfirmDeleteModal
      :open="!!pendingDelete"
      :loading="deleting"
      title="Remove staff account?"
      :message="`${pendingDelete?.name || 'This user'} will lose access to the business.`"
      @cancel="pendingDelete = null"
      @confirm="remove"
    />
  </div>
</template>
