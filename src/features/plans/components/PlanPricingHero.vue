<script setup lang="ts">
import { BadgePercent, Check, Sparkles } from "lucide-vue-next";
</script>

<template>
  <div class="pricing-hero">
    <div class="pricing-hero-icon">
      <Sparkles :size="23" />
    </div>

    <div class="pricing-hero-content">
      <span class="pricing-eyebrow">SIMPLE, TRANSPARENT PRICING</span>

      <h2>Choose the right plan for your business</h2>

      <p>
        Get all the tools you need to manage your vehicles. Choose a longer
        billing period and enjoy bigger savings.
      </p>

      <div class="pricing-hero-badges">
        <span>
          <Check :size="14" />
          No hidden fees
        </span>

        <span>
          <BadgePercent :size="14" />
          Save with longer plans
        </span>

        <span>
          <Check :size="14" />
          Complete feature set
        </span>
      </div>
    </div>
  </div>
</template>

