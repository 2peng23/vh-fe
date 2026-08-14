<script setup lang="ts">
import { X } from "lucide-vue-next";

defineProps<{
  open: boolean;
  form: Record<string, any>;
  errors: Record<string, string[]>;
  saving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
}>();
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <form class="modal" @submit.prevent="emit('save')">
      <div class="modal-head"><div><h2>Edit vehicle</h2><p>Update identification and vehicle information.</p></div><button type="button" class="icon-btn" @click="emit('close')"><X /></button></div>
      <div class="field-grid">
        <label>Plate number<input v-model="form.plate_number" required /><small v-if="errors.plate_number">{{ errors.plate_number[0] }}</small></label>
        <label>Brand<input v-model="form.brand" required /><small v-if="errors.brand">{{ errors.brand[0] }}</small></label>
        <label>Model<input v-model="form.model" required /><small v-if="errors.model">{{ errors.model[0] }}</small></label>
        <label>Variant<input v-model="form.variant" /></label>
        <label>Year<input v-model.number="form.year" type="number" min="1900" /></label>
        <label>Vehicle type<select v-model="form.vehicle_type" required><option>Car</option><option>Van</option><option>Truck</option><option>Pickup</option><option>Motorcycle</option><option>Bus</option><option>SUV</option><option>Heavy Equipment</option><option>Other</option></select></label>
        <label>Current mileage<input v-model.number="form.current_mileage" type="number" disabled /><small>Update mileage from the Mileage tab.</small></label>
        <label>Color<input v-model="form.color" /></label>
        <label>Purchased date<input v-model="form.acquisition_date" type="date" /></label>
        <label>Vehicle cost<input v-model.number="form.acquisition_cost" type="number" min="0" step="0.01" /></label>
        <label>Status<select v-model="form.status"><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option><option value="sold">Sold</option><option value="disposed">Disposed</option></select></label>
        <label class="full">Notes<textarea v-model="form.notes"></textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="btn" @click="emit('close')">Cancel</button><button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving..." : "Save changes" }}</button></div>
    </form>
  </div>
</template>
