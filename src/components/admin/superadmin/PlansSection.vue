<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Pencil, Plus, X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../../api/client";
import type { ApiEnvelope } from "../../../types";
import type { AdminPlanOffering, ValidationBag } from "../../../types/admin";
import EmptyState from "../../EmptyState.vue";
import LoadingState from "../../LoadingState.vue";
import StatusBadge from "../../StatusBadge.vue";
import { formatCurrency } from "../../../utils";

const rows = ref<AdminPlanOffering[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const modalOpen = ref(false);
const editing = ref<AdminPlanOffering | null>(null);
const formErrors = ref<ValidationBag>({});
const defaultForm = () => ({ plan: "starter", name: "Starter", duration_months: 1, price: "", vehicle_limit: 5, details: "", is_active: true });
const form = reactive(defaultForm());

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AdminPlanOffering[]>>("/superadmin/plan-offerings");
    rows.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function openPlan(offering: AdminPlanOffering | null = null) {
  editing.value = offering;
  formErrors.value = {};
  Object.assign(form, offering || defaultForm());
  modalOpen.value = true;
}

async function savePlan() {
  saving.value = true;
  error.value = "";
  formErrors.value = {};
  try {
    if (editing.value) await api.put(`/superadmin/plan-offerings/${editing.value.id}`, form);
    else await api.post("/superadmin/plan-offerings", form);
    modalOpen.value = false;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
    formErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Plans</strong><small>{{ rows.length }} records</small></div>
      <button class="btn btn-primary" @click="openPlan()"><Plus />Add plan</button>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" title="No plans found" />
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Plan</th><th>Period</th><th>Price</th><th>Vehicle limit</th><th>Details</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="offering in rows" :key="offering.id">
            <td><strong>{{ offering.name }}</strong><small class="cell-small capitalize">{{ offering.plan }}</small></td>
            <td>{{ offering.duration_months === 12 ? "1 year" : `${offering.duration_months} month${offering.duration_months > 1 ? "s" : ""}` }}</td>
            <td>{{ formatCurrency(offering.price) }}</td>
            <td>{{ offering.vehicle_limit }}</td>
            <td>{{ offering.details || "—" }}</td>
            <td><StatusBadge :status="offering.is_active ? 'Active' : 'Inactive'" /></td>
            <td><button class="icon-btn" title="Edit plan" @click="openPlan(offering)"><Pencil /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
    <form class="modal plan-offering-modal" @submit.prevent="savePlan">
      <div class="modal-head">
        <div><h2>{{ editing ? "Edit plan" : "Add plan" }}</h2><p>Configure the price and details shown to owners.</p></div>
        <button type="button" class="icon-btn" aria-label="Close plan editor" @click="modalOpen = false"><X /></button>
      </div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div class="field-grid plan-offering-fields">
        <label>Plan<select v-model="form.plan" required><option value="starter">Starter</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></label>
        <label>Display name<input v-model="form.name" required maxlength="100" /><small v-if="formErrors.name">{{ formErrors.name[0] }}</small></label>
        <label>Billing period<select v-model.number="form.duration_months" required><option :value="1">1 month</option><option :value="6">6 months</option><option :value="12">1 year</option></select></label>
        <label>Price<input v-model="form.price" type="number" min="0" step="0.01" required /><small v-if="formErrors.price">{{ formErrors.price[0] }}</small></label>
        <label>Vehicle limit<input v-model.number="form.vehicle_limit" type="number" min="1" required /><small v-if="formErrors.vehicle_limit">{{ formErrors.vehicle_limit[0] }}</small></label>
        <label>Status<select v-model="form.is_active"><option :value="true">Active</option><option :value="false">Inactive</option></select></label>
        <label class="full">Details<textarea v-model="form.details" rows="4" maxlength="1000" placeholder="Describe the benefits included with this plan."></textarea><small v-if="formErrors.details">{{ formErrors.details[0] }}</small></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="modalOpen = false">Cancel</button>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving…" : "Save plan" }}</button>
      </div>
    </form>
  </div>
</template>
