/**
 * Pricing / zone logic — single source of truth.
 *
 * IMPORTANT: Pricing is determined by the UNIVERSITY's pricing_zone,
 * NOT the student's governorate. This prevents zone-mismatch exploits.
 */
import { ZONE_A_GOVERNORATES } from "./constants";

export type PriceZone = "a" | "b" | null;

/**
 * @deprecated Use getZoneFromUniversity instead. Kept only for backward compat.
 */
export const getZone = (gov: string | null): PriceZone => {
  if (!gov) return null;
  return ZONE_A_GOVERNORATES.some((g) => gov.includes(g)) ? "a" : "b";
};

/**
 * Derive pricing zone from university's pricing_zone field.
 * This is the ONLY trusted source for pricing decisions.
 */
export const getZoneFromUniversity = (pricingZone: string | null | undefined): PriceZone => {
  if (!pricingZone) return null;
  return pricingZone === "a" ? "a" : "b";
};

export interface PlanPricing {
  price_zone_a: number;
  price_zone_b: number;
  price_default: number;
}

/**
 * @deprecated Use getPlanPriceByZone instead.
 */
export const getPlanPrice = (plan: PlanPricing, gov: string | null): number => {
  const zone = getZone(gov);
  if (zone === "a") return plan.price_zone_a;
  if (zone === "b") return plan.price_zone_b;
  return plan.price_default;
};

/**
 * Get plan price from a known pricing zone (derived from university).
 */
export const getPlanPriceByZone = (plan: PlanPricing, zone: PriceZone): number => {
  if (zone === "a") return plan.price_zone_a;
  if (zone === "b") return plan.price_zone_b;
  return plan.price_default;
};
