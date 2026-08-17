<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Pencil, Plus, QrCode, Trash2, X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../../api/client";
import type { ApiEnvelope } from "../../../types";
import type { AdminPaymentMethod, ValidationBag } from "../../../types/admin";
import { formatDate } from "../../../utils/date";
import ConfirmDeleteModal from "../../ConfirmDeleteModal.vue";
import EmptyState from "../../EmptyState.vue";
import LoadingState from "../../LoadingState.vue";

const rows = ref<AdminPaymentMethod[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const modalOpen = ref(false);
const editing = ref<AdminPaymentMethod | null>(null);
const deleting = ref<AdminPaymentMethod | null>(null);
const qrFile = ref<File | null>(null);
const formErrors = ref<ValidationBag>({});
const form = reactive({ name: "", account_name: "", account_number: "", remove_qr: false });
const qrPreview = ref<{ name: string; url: string } | null>(null);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AdminPaymentMethod[]>>("/superadmin/payment-methods");
    rows.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function addPaymentMethod() {
  editing.value = null;
  formErrors.value = {};
  qrFile.value = null;
  Object.assign(form, { name: "", account_name: "", account_number: "", remove_qr: false });
  modalOpen.value = true;
}

function editPaymentMethod(method: AdminPaymentMethod) {
  editing.value = method;
  formErrors.value = {};
  qrFile.value = null;
  Object.assign(form, {
    name: method.name,
    account_name: method.account_name,
    account_number: method.account_number,
    remove_qr: false,
  });
  modalOpen.value = true;
}

function choosePaymentQr(event: Event) {
  qrFile.value = (event.target as HTMLInputElement).files?.[0] || null;
}

async function savePaymentMethod() {
  saving.value = true;
  formErrors.value = {};
  error.value = "";
  try {
    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("account_name", form.account_name);
    payload.append("account_number", form.account_number);
    if (qrFile.value) payload.append("qr", qrFile.value);
    if (form.remove_qr) payload.append("remove_qr", "1");
    if (editing.value) payload.append("_method", "PUT");

    const path = editing.value
      ? `/superadmin/payment-methods/${editing.value.id}`
      : "/superadmin/payment-methods";

    await api.post(path, payload);
    modalOpen.value = false;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
    formErrors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}

async function deletePaymentMethod() {
  if (!deleting.value) return;
  saving.value = true;
  error.value = "";
  try {
    await api.delete(`/superadmin/payment-methods/${deleting.value.id}`);
    deleting.value = null;
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

async function viewPaymentQr(method: AdminPaymentMethod) {
  const response = await api.get(`/superadmin/payment-methods/${method.id}/qr`, { responseType: "blob" });
  closeQrPreview();
  qrPreview.value = { name: method.name, url: URL.createObjectURL(response.data) };
}

function closeQrPreview() {
  if (qrPreview.value?.url) URL.revokeObjectURL(qrPreview.value.url);
  qrPreview.value = null;
}

onMounted(load);
onBeforeUnmount(closeQrPreview);
</script>

<template>
  <div class="superadmin-panel card">
    <div class="superadmin-toolbar">
      <div><strong>Payment methods</strong><small>{{ rows.length }} records</small></div>
      <button class="btn btn-primary" @click="addPaymentMethod"><Plus />Add payment method</button>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" title="No payment methods found" />
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Payment method</th><th>Account name</th><th>Account number</th><th>QR</th><th>Created</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="method in rows" :key="method.id">
            <td><strong>{{ method.name }}</strong></td>
            <td>{{ method.account_name }}</td>
            <td>{{ method.account_number }}</td>
            <td><button v-if="method.qr_path" type="button" class="btn btn-small" @click="viewPaymentQr(method)"><QrCode />View QR</button><span v-else>—</span></td>
            <td>{{ formatDate(method.created_at) }}</td>
            <td>
              <span class="row-actions">
                <button type="button" class="icon-btn" title="Edit payment method" @click="editPaymentMethod(method)"><Pencil /></button>
                <button type="button" class="icon-btn" title="Delete payment method" @click="deleting = method"><Trash2 /></button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ConfirmDeleteModal
    :open="!!deleting"
    :loading="saving"
    title="Delete payment method?"
    :message="`This will permanently remove ${deleting?.name || 'this payment method'} and its QR image.`"
    @cancel="deleting = null"
    @confirm="deletePaymentMethod"
  />

  <div v-if="qrPreview" class="modal-backdrop" @click.self="closeQrPreview">
    <section class="modal payment-qr-modal" role="dialog" aria-modal="true" :aria-label="`${qrPreview.name} QR code`">
      <div class="modal-head">
        <div><h2>{{ qrPreview.name }}</h2><p>Scan this QR code to make a payment.</p></div>
        <button type="button" class="icon-btn" aria-label="Close QR preview" @click="closeQrPreview"><X /></button>
      </div>
      <div class="payment-qr-preview"><img :src="qrPreview.url" :alt="`${qrPreview.name} payment QR code`" /></div>
    </section>
  </div>

  <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
    <form class="modal" @submit.prevent="savePaymentMethod">
      <div class="modal-head">
        <div><h2>{{ editing ? "Edit" : "Add" }} payment method</h2><p>Configure payment instructions for plan purchases.</p></div>
        <button type="button" class="icon-btn" @click="modalOpen = false"><X /></button>
      </div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <div class="field-grid">
        <label>Payment method<select v-model="form.name" required><option disabled value="">Select a payment method</option><option>Maya</option><option>GCash</option><option>BDO</option><option>Chinabank</option><option>UnionBank</option></select><small v-if="formErrors.name">{{ formErrors.name[0] }}</small></label>
        <label>Account name<input v-model="form.account_name" required maxlength="150" /><small v-if="formErrors.account_name">{{ formErrors.account_name[0] }}</small></label>
        <label>Account number<input v-model="form.account_number" required maxlength="150" /><small v-if="formErrors.account_number">{{ formErrors.account_number[0] }}</small></label>
        <label class="full">QR image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" @change="choosePaymentQr" /><small>JPG, PNG, or WebP up to 5 MB.</small><small v-if="formErrors.qr">{{ formErrors.qr[0] }}</small></label>
        <label v-if="editing?.qr_path && !qrFile" class="full checkbox-label"><input v-model="form.remove_qr" type="checkbox" />Remove current QR image</label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" @click="modalOpen = false">Cancel</button>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving…" : "Save payment method" }}</button>
      </div>
    </form>
  </div>
</template>
