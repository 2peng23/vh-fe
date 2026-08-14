<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { Plus, Search, CarFront, X } from "lucide-vue-next";
import api, { errorMessage, validationErrors } from "../../api/client";
import type { ApiEnvelope, PaginationMeta, Vehicle } from "../../types";
import PageHeader from "../../components/PageHeader.vue";
import LoadingState from "../../components/LoadingState.vue";
import EmptyState from "../../components/EmptyState.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import PaginationControls from "../../components/PaginationControls.vue";
import SupportChatView from "../SupportChatView.vue";
import { useAuthStore } from "../../stores/auth";
const auth = useAuthStore();
const subscription = computed(() => auth.user?.business?.subscription);
const vehicleLimitReached = computed(
  () => subscription.value?.vehicle_limit_reached ?? false,
);
const vehicles = ref<Vehicle[]>([]),
  meta = ref<PaginationMeta>(),
  loading = ref(true),
  error = ref(""),
  search = ref(""),
  status = ref(""),
  page = ref(1),
  perPage = ref(20),
  modal = ref(false),
  supportOpen = ref(false),
  saving = ref(false),
  errors = ref<Record<string, string[]>>({});
const form = reactive({
  plate_number: "",
  brand: "",
  model: "",
  variant: "",
  year: new Date().getFullYear(),
  vehicle_type: "Van",
  current_mileage: 0,
  status: "active",
  color: "",
  acquisition_date: "",
  acquisition_cost: "",
  notes: "",
});
let timer: number;
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<Vehicle[]>>("/vehicles", {
      params: {
        search: search.value,
        status: status.value,
        page: page.value,
        per_page: perPage.value,
      },
    });
    vehicles.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
watch([search, status], () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
});
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
onMounted(load);
async function save() {
  saving.value = true;
  errors.value = {};
  try {
    await api.post("/vehicles", form);
    modal.value = false;
    Object.assign(form, {
      plate_number: "",
      brand: "",
      model: "",
      variant: "",
      year: new Date().getFullYear(),
      vehicle_type: "Van",
      current_mileage: 0,
      status: "active",
      color: "",
      acquisition_date: "",
      acquisition_cost: "",
      notes: "",
    });
    await Promise.all([load(), auth.fetchMe()]);
  } catch (e) {
    error.value = errorMessage(e);
    errors.value = validationErrors(e);
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div>
    <PageHeader
      title="Vehicles"
      description="Manage every vehicle, its status, mileage, and history."
      ><button v-if="auth.can('vehicles.create')" class="btn btn-primary" :disabled="vehicleLimitReached" @click="modal = true">
        <Plus :size="17" />{{ vehicleLimitReached ? "Vehicle limit reached" : "Add vehicle" }}
      </button></PageHeader
    >
    <div
      v-if="subscription && subscription.usage_percent >= 80"
      class="alert"
      :class="vehicleLimitReached ? 'error' : 'warning'"
    >
      <strong>{{ subscription.label }} plan:</strong>
      {{ subscription.vehicle_count }} of {{ subscription.vehicle_limit }} vehicle slots used.
      <span v-if="vehicleLimitReached">Upgrade the subscription to add another vehicle. <button type="button" class="alert-support-link" @click="supportOpen = true">Contact support</button></span>
      <span v-else>{{ subscription.vehicles_remaining }} slots remaining.</span>
    </div>
    <div class="toolbar">
      <div class="search-input">
        <Search /><input
          v-model="search"
          placeholder="Search plate, code, brand or model"
        />
      </div>
      <select v-model="status">
        <option value="">All statuses</option>
        <option>active</option>
        <option>maintenance</option>
        <option>inactive</option>
        <option>sold</option>
      </select>
    </div>
    <div class="alert error" v-if="error">{{ error }}</div>
    <div v-if="supportOpen" class="modal-backdrop support-modal-backdrop" @click.self="supportOpen = false"><SupportChatView embedded @close="supportOpen = false" /></div>
    <LoadingState v-if="loading" /><EmptyState
      v-else-if="!vehicles.length"
      title="No vehicles found"
      message="Add a vehicle or adjust your search filters."
      ><button v-if="auth.can('vehicles.create')" class="btn btn-primary" :disabled="vehicleLimitReached" @click="modal = true">
        Add vehicle
      </button></EmptyState
    >
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate number</th>
              <th>Type</th>
              <th>Current mileage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in vehicles" :key="v.id">
              <td>
                <RouterLink class="vehicle-cell" :to="`/vehicles/${v.id}`"
                  ><span><CarFront /></span>
                  <div>
                    <strong>{{ v.brand }} {{ v.model }}</strong
                    ><small
                      >{{ v.vehicle_code || "No vehicle code" }} ·
                      {{ v.year }}</small
                    >
                  </div></RouterLink
                >
              </td>
              <td class="mono">{{ v.plate_number }}</td>
              <td>{{ v.vehicle_type }}</td>
              <td>
                {{ Number(v.current_mileage).toLocaleString() }}
                km
              </td>
              <td><StatusBadge :status="v.status" /></td>
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
    <div class="modal-backdrop" v-if="modal" @click.self="modal = false">
      <form class="modal" @submit.prevent="save">
        <div class="modal-head">
          <div>
            <h2>Add a vehicle</h2>
            <p>Enter the vehicle’s essential information.</p>
          </div>
          <button type="button" class="icon-btn" @click="modal = false">
            <X />
          </button>
        </div>
        <div class="field-grid">
          <label
            >Plate number<input v-model="form.plate_number" required /><small
              v-if="errors.plate_number"
              >{{ errors.plate_number[0] }}</small
            ></label
          ><label>Brand<input v-model="form.brand" required /></label
          ><label>Model<input v-model="form.model" required /></label
          ><label>Variant<input v-model="form.variant" /></label
          ><label>Year<input v-model.number="form.year" type="number" /></label
          ><label
            >Vehicle type<select
              v-model="form.vehicle_type"
            >
              <option>Car</option>
              <option>Van</option>
              <option>Truck</option>
              <option>Pickup</option>
              <option>Motorcycle</option>
              <option>Bus</option>
              <option>SUV</option>
              <option>Heavy Equipment</option>
              <option>Other</option>
            </select></label
          ><label
            >Current mileage<input
              v-model.number="form.current_mileage"
              type="number"
              min="0" /></label
          ><label
            >Status<select v-model="form.status">
              <option>active</option>
              <option>maintenance</option>
              <option>inactive</option>
            </select></label
          ><label>Color<input v-model="form.color" /></label
          ><label
            >Purchased date<input
              v-model="form.acquisition_date"
              type="date" /></label
          ><label
            >Vehicle cost<input
              v-model.number="form.acquisition_cost"
              type="number"
              min="0"
              step="0.01" /></label
          ><label class="full"
            >Notes<textarea v-model="form.notes"></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modal = false">
            Cancel</button
          ><button class="btn btn-primary" :disabled="saving">
            {{ saving ? "Saving…" : "Add vehicle" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
