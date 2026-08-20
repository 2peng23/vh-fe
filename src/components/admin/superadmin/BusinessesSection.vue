<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../../api/client";
import type { ApiEnvelope, PaginationMeta } from "../../../types";
import type { AdminBusiness, ValidationBag } from "../../../types/admin";
import BusinessTable from "../BusinessTable.vue";
import EmptyState from "../../EmptyState.vue";
import LoadingState from "../../LoadingState.vue";
import PaginationControls from "../../PaginationControls.vue";

const props = withDefaults(defineProps<{ initialSearch?: string }>(), { initialSearch: "" });
const emit = defineEmits<{ openSupport: [business: AdminBusiness] }>();

const rows = ref<AdminBusiness[]>([]);
const meta = ref<PaginationMeta>();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const search = ref("");
const page = ref(1);
const perPage = ref(20);
const editing = ref<AdminBusiness | null>(null);
const creatingOwner = ref(false);
const createErrors = ref<ValidationBag>({});

const form = reactive<Record<string, string | number | undefined>>({});
const ownerForm = reactive({
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  subscription_plan: "trial",
  subscription_status: "active",
  vehicle_limit_override: "" as string | number,
  plan_ends_at: defaultPlanEndDate(),
});

function todayInManila() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function defaultPlanEndDate() {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
}

function statusFromPlanEnd(value: string) {
  return value && value < todayInManila() ? "past_due" : "active";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AdminBusiness[]>>("/superadmin/businesses", {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    });
    rows.value = data.data;
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

function focusBusiness(business: AdminBusiness) {
  search.value = business.name;
  runSearch();
}

function openCreateOwner() {
  createErrors.value = {};
  error.value = "";
  creatingOwner.value = true;
}

defineExpose({ openCreateOwner });

function editBusiness(row: AdminBusiness) {
  editing.value = row;
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, {
    name: row.name,
    email: row.email,
    subscription_plan: row.subscription_plan,
    subscription_status: row.subscription_status,
    status: row.status || "active",
    plan_ends_at: row.plan_ends_at?.slice(0, 10) || "",
    vehicle_limit_override: row.vehicle_limit_override ?? "",
  });
}

async function saveBusiness() {
  if (!editing.value) return;
  saving.value = true;
  error.value = "";
  try {
    await api.put(`/superadmin/businesses/${editing.value.id}`, { ...form });
    editing.value = null;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

async function createOwner() {
  saving.value = true;
  error.value = "";
  createErrors.value = {};
  try {
    await api.post("/superadmin/owners", { ...ownerForm });
    creatingOwner.value = false;
    Object.assign(ownerForm, {
      business_name: "",
      owner_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
      subscription_plan: "trial",
      subscription_status: "active",
      vehicle_limit_override: "",
      plan_ends_at: defaultPlanEndDate(),
    });
    await load();
  } catch (e) {
    error.value = errorMessage(e);
    createErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}

watch(() => ownerForm.plan_ends_at, (value) => {
  ownerForm.subscription_status = statusFromPlanEnd(value);
});

watch(() => form.plan_ends_at, (value) => {
  if (editing.value) form.subscription_status = statusFromPlanEnd(String(value || ""));
});

watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
watch(() => props.initialSearch, (value) => {
  if (value === search.value) return;
  search.value = value;
  page.value = 1;
  load();
});

onMounted(() => {
  search.value = props.initialSearch;
  load();
});
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Businesses</strong><small>{{ meta?.total ?? rows.length }} records</small></div>
      <div class="superadmin-search">
        <input v-model="search" placeholder="Search businesses" @keyup.enter="runSearch" />
        <button class="btn btn-primary" @click="runSearch">Search</button>
      </div>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" title="No businesses found" />
    <div v-else class="table-wrap">
      <BusinessTable
        :businesses="rows"
        @edit="editBusiness"
        @support="emit('openSupport', $event)"
        @view="focusBusiness"
      />
    </div>

    <PaginationControls v-if="meta" v-model:page="page" v-model:per-page="perPage" :meta="meta" />
  </div>

  <div v-if="creatingOwner" class="modal-backdrop" @click.self="creatingOwner = false">
    <form class="modal" @submit.prevent="createOwner">
      <div class="modal-head">
        <div><h2>Add owner</h2><p>Create a new tenant business and its owner account.</p></div>
        <button type="button" class="icon-btn" @click="creatingOwner = false"><X /></button>
      </div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div class="field-grid">
        <label>Business name<input v-model="ownerForm.business_name" required /><small v-if="createErrors.business_name">{{ createErrors.business_name[0] }}</small></label>
        <label>Owner name<input v-model="ownerForm.owner_name" required /><small v-if="createErrors.owner_name">{{ createErrors.owner_name[0] }}</small></label>
        <label>Email<input v-model="ownerForm.email" type="email" required /><small v-if="createErrors.email">{{ createErrors.email[0] }}</small></label>
        <label>Phone<input v-model="ownerForm.phone" /></label>
        <label>Plan<select v-model="ownerForm.subscription_plan"><option value="trial">Trial - 10 vehicles</option><option value="starter">Starter - 10 vehicles</option><option value="business">Business - 30 vehicles</option><option value="enterprise">Enterprise - 100 vehicles</option></select></label>
        <label>Status<input :value="statusFromPlanEnd(ownerForm.plan_ends_at).replace('_', ' ')" disabled /><small>Automatically based on the plan end date.</small></label>
        <label>Custom vehicle limit<input v-model.number="ownerForm.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Optional. Leave blank to use the plan limit.</small><small v-if="createErrors.vehicle_limit_override">{{ createErrors.vehicle_limit_override[0] }}</small></label>
        <label>Plan ends<input v-model="ownerForm.plan_ends_at" type="date" required /><small v-if="createErrors.plan_ends_at">{{ createErrors.plan_ends_at[0] }}</small></label>
        <label>Password<input v-model="ownerForm.password" type="password" autocomplete="new-password" required /><small v-if="createErrors.password">{{ createErrors.password[0] }}</small></label>
        <label>Confirm password<input v-model="ownerForm.password_confirmation" type="password" autocomplete="new-password" required /></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="creatingOwner = false">Cancel</button>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? "Creating…" : "Create owner" }}</button>
      </div>
    </form>
  </div>

  <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
    <form class="modal" @submit.prevent="saveBusiness">
      <div class="modal-head">
        <div><h2>Edit business</h2><p>Platform-level account management</p></div>
        <button type="button" class="icon-btn" @click="editing = null"><X /></button>
      </div>
      <div class="field-grid">
        <label>Business name<input v-model="form.name" required /></label>
        <label>Email<input v-model="form.email" type="email" required /></label>
        <label>Plan<select v-model="form.subscription_plan"><option>trial</option><option>starter</option><option>business</option><option>enterprise</option></select></label>
        <label>Business access<select v-model="form.status"><option value="active">Active</option><option value="inactive">Inactive / Disabled</option></select><small>Inactive blocks the owner and all staff accounts.</small></label>
        <label>Plan status<input :value="statusFromPlanEnd(String(form.plan_ends_at || '')).replace('_', ' ')" disabled /><small>Automatically based on the plan end date.</small></label>
        <label>Custom vehicle limit<input v-model.number="form.vehicle_limit_override" type="number" min="1" max="100000" placeholder="Use plan default" /><small>Leave blank to use the selected plan limit.</small></label>
        <label>Plan ends<input v-model="form.plan_ends_at" type="date" /></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="editing = null">Cancel</button>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving…" : "Save changes" }}</button>
      </div>
    </form>
  </div>
</template>
