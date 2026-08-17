<script setup lang="ts">
import { X } from "lucide-vue-next";
import type { QrPreview } from "../types";

defineProps<{
  preview: QrPreview;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section
      class="modal payment-qr-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`${preview.name} QR code`"
    >
      <div class="modal-head">
        <div>
          <h2>{{ preview.name }}</h2>
          <p>Scan this QR code to make your payment.</p>
        </div>

        <button
          type="button"
          class="icon-btn"
          aria-label="Close QR preview"
          @click="$emit('close')"
        >
          <X />
        </button>
      </div>

      <div class="payment-qr-preview">
        <img :src="preview.url" :alt="`${preview.name} payment QR code`" />
      </div>
    </section>
  </div>
</template>
