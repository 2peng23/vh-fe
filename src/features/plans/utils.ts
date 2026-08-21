import type {
  EnrichedPlanGroup,
  EnrichedPlanOffering,
  PlanGroup,
  PlanOffering,
} from "./types";
import { formatCurrency } from "../../utils";

const PLAN_TIER_ORDER = ["trial", "starter", "business", "enterprise"];

export function formatPlanCurrency(value: number | string): string {
  return formatCurrency(value);
}

export function billingPeriodLabel(months: number): string {
  if (months === 1) return "Monthly";
  if (months === 6) return "6 Months";
  if (months === 12) return "Yearly";

  return `${months} Months`;
}

export function billingPeriodShortLabel(months: number): string {
  if (months === 1) return "/ month";
  if (months === 12) return "/ year";

  return `/ ${months} months`;
}

export function formatPlanDate(value?: string | null): string {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function planClass(name: string): string {
  return `plan-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

export function isPopularPlan(name: string): boolean {
  return name.toLowerCase() === "business";
}

function normalizedPlan(plan?: string | null): string {
  return String(plan || "").trim().toLowerCase();
}

function tierIndex(plan?: string | null): number {
  return PLAN_TIER_ORDER.indexOf(normalizedPlan(plan));
}

export function recommendedPlanForCurrentTier(currentTier?: string | null): string {
  const currentIndex = tierIndex(currentTier);

  if (currentIndex < 0) return "business";

  return PLAN_TIER_ORDER[Math.min(currentIndex + 1, PLAN_TIER_ORDER.length - 1)];
}

export function findRecommendedOffering(
  offerings: PlanOffering[],
  currentTier?: string | null,
): PlanOffering | undefined {
  const targetPlan = recommendedPlanForCurrentTier(currentTier);
  const targetMonthly = offerings.find(
    (offering) =>
      normalizedPlan(offering.plan) === targetPlan &&
      Number(offering.duration_months) === 1,
  );

  if (targetMonthly) return targetMonthly;

  const targetOffering = offerings.find(
    (offering) => normalizedPlan(offering.plan) === targetPlan,
  );

  if (targetOffering) return targetOffering;

  return (
    offerings.find((offering) => Number(offering.duration_months) === 1) ??
    offerings[0]
  );
}

export function findRenewalOffering(
  offerings: PlanOffering[],
  currentTier?: string | null,
): PlanOffering | undefined {
  const currentPlan = normalizedPlan(currentTier);

  if (!currentPlan || currentPlan === "trial") return undefined;

  return (
    offerings.find(
      (offering) =>
        normalizedPlan(offering.plan) === currentPlan &&
        Number(offering.duration_months) === 1,
    ) ?? offerings.find((offering) => normalizedPlan(offering.plan) === currentPlan)
  );
}

export function findUpgradeOffering(
  offerings: PlanOffering[],
  currentTier?: string | null,
): PlanOffering | undefined {
  const currentIndex = tierIndex(currentTier);

  if (currentIndex < 0) return findRecommendedOffering(offerings, currentTier);

  const nextPlan = PLAN_TIER_ORDER[currentIndex + 1];

  if (!nextPlan) return undefined;

  return (
    offerings.find(
      (offering) =>
        normalizedPlan(offering.plan) === nextPlan &&
        Number(offering.duration_months) === 1,
    ) ?? offerings.find((offering) => normalizedPlan(offering.plan) === nextPlan)
  );
}

export function buildPlanGroups(
  offerings: PlanOffering[],
): EnrichedPlanGroup[] {
  const groups = new Map<string, PlanGroup>();

  for (const offering of offerings) {
    const key = String(offering.name);
    let group = groups.get(key);

    if (!group) {
      group = {
        name: offering.name,
        vehicleLimit: Number(offering.vehicle_limit),
        details: offering.details,
        offerings: [],
      };

      groups.set(key, group);
    }

    group.offerings.push(offering);
  }

  return Array.from(groups.values()).map((group) => {
    const sortedOfferings = [...group.offerings].sort(
      (a, b) => Number(a.duration_months) - Number(b.duration_months),
    );

    const monthlyOffering = sortedOfferings.find(
      (offering) => Number(offering.duration_months) === 1,
    );

    const monthlyPrice = Number(monthlyOffering?.price ?? 0);

    const calculatedOfferings = sortedOfferings.map(
      (offering): Omit<EnrichedPlanOffering, "best_value"> => {
        const duration = Number(offering.duration_months);
        const price = Number(offering.price);
        const regularPrice = monthlyPrice > 0 ? monthlyPrice * duration : price;
        const discountPercent =
          duration > 1 && regularPrice > price
            ? Math.round(((regularPrice - price) / regularPrice) * 100)
            : 0;

        return {
          ...offering,
          regular_price: regularPrice,
          discount_percent: discountPercent,
          monthly_equivalent: duration > 0 ? price / duration : price,
          savings: regularPrice > price ? regularPrice - price : 0,
        };
      },
    );

    const highestDiscount = Math.max(
      0,
      ...calculatedOfferings.map((offering) => offering.discount_percent),
    );

    return {
      name: group.name,
      vehicleLimit: group.vehicleLimit,
      details: group.details,
      offerings: calculatedOfferings.map((offering) => ({
        ...offering,
        best_value:
          highestDiscount > 0 && offering.discount_percent === highestDiscount,
      })),
    };
  });
}
