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

<style scoped>
.pricing-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding: 26px 28px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at top right,
      rgba(20, 184, 166, 0.16),
      transparent 35%
    ),
    linear-gradient(135deg, #f0fdfa 0%, #ffffff 55%, #f8fafc 100%);
  border: 1px solid #ccfbf1;
  border-radius: 18px;
}

.pricing-hero-icon {
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(20, 184, 166, 0.25);
}

.pricing-hero-content {
  min-width: 0;
}

.pricing-eyebrow {
  display: inline-block;
  color: #0f766e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.pricing-hero h2 {
  margin: 5px 0 7px;
  color: #0f172a;
  font-size: 26px;
  line-height: 1.2;
}

.pricing-hero p {
  max-width: 720px;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.pricing-hero-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.pricing-hero-badges span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  color: #0f766e;
  background: #ffffff;
  border: 1px solid #ccfbf1;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 760px) {
  .pricing-hero {
    align-items: flex-start;
    padding: 20px;
  }

  .pricing-hero-icon {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }

  .pricing-hero h2 {
    font-size: 21px;
  }
}

@media (max-width: 640px) {
  .pricing-hero {
    flex-direction: column;
  }
}
</style>
