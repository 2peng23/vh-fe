<script setup lang="ts">
import { AlertTriangle, X } from "lucide-vue-next";

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    message?: string;
    loading?: boolean;
  }>(),
  {
    title: "Delete record?",
    message: "This action cannot be undone.",
    loading: false,
  },
);

const emit = defineEmits<{ cancel: []; confirm: [] }>();
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('cancel')">
    <section
      class="modal confirm-delete-modal"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="confirm-delete-content">
        <span class="confirm-delete-icon"><AlertTriangle /></span>
        <div>
          <h2>{{ title }}</h2>
          <p>{{ message }}</p>
        </div>
        <button
          type="button"
          class="icon-btn confirm-delete-close"
          aria-label="Close"
          :disabled="loading"
          @click="emit('cancel')"
        >
          <X />
        </button>
      </div>
      <div class="modal-actions">
        <button
          type="button"
          class="btn"
          :disabled="loading"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-delete"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? "Deleting…" : "Delete" }}
        </button>
      </div>
    </section>
  </div>
</template>
