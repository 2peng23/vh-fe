<script setup lang="ts">
import { Download, X } from "lucide-vue-next";

defineProps<{ open: boolean; url: string }>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();
</script>

<template>
  <div v-if="open" class="modal-backdrop photo-preview-backdrop" @click.self="emit('close')">
    <div class="photo-preview-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h2>Odometer photo</h2>
          <p>Uploaded mileage evidence</p>
        </div>
        <div class="modal-head-actions">
          <button type="button" class="btn" @click="emit('download')">
            <Download />Download
          </button>
          <button type="button" class="icon-btn" @click="emit('close')">
            <X />
          </button>
        </div>
      </div>
      <div class="photo-preview-body">
        <img :src="url" alt="Odometer mileage evidence" />
      </div>
    </div>
  </div>
</template>
