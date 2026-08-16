<script setup lang="ts">
import { Download, X } from "lucide-vue-next";
import EmptyState from "../../EmptyState.vue";

defineProps<{
  open: boolean;
  url: string;
  name: string;
  isPdf: boolean;
  isImage: boolean;
}>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop photo-preview-backdrop"
    @click.self="emit('close')"
  >
    <div
      class="photo-preview-modal document-preview-modal"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-head">
        <div>
          <h2>Document preview</h2>
          <p>{{ name }}</p>
        </div>
        <div class="modal-head-actions">
          <button type="button" class="btn" @click="emit('download')">
            <Download />Download
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
            @click="emit('close')"
          >
            <X />
          </button>
        </div>
      </div>
      <div class="document-preview-body">
        <iframe
          v-if="isPdf"
          :src="url"
          title="Vehicle document preview"
        ></iframe>
        <img v-else-if="isImage" :src="url" alt="Vehicle document preview" />
        <EmptyState
          v-else
          title="Preview unavailable"
          message="This file type cannot be previewed. Use Download to open it on your device."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-preview-modal {
  width: min(800px, calc(100vw - 48px));
  max-height: 80vh;
}

.document-preview-body {
  max-height: calc(80vh - 90px);
  overflow: hidden;
  overflow-y: auto;
}

.document-preview-body img {
  display: block;
  max-width: 100%;
  max-height: calc(80vh - 120px);
  width: auto;
  height: auto;
  margin: 0 auto;
  object-fit: contain;
}

.document-preview-body iframe {
  width: 100%;
  height: 65vh;
  border: 0;
}
</style>
