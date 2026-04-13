/**
 * Pricing / zone logic — single source of truth.
 */
import { ZONE_A_GOVERNORATES } from "./constants";

export type PriceZone = "a" | "b" | null;

export const getZone = (gov: string | null): PriceZone => {
  if (!gov) return null;
  return ZONE_A_GOVERNORATES.some((g) => gov.includes(g)) ? "a" : "b";
};

export interface PlanPricing {
  price_zone_a: number;
  price_zone_b: number;
  price_default: number;
}

export const getPlanPrice = (plan: PlanPricing, gov: string | null): number => {
  const zone = getZone(gov);
  if (zone === "a") return plan.price_zone_a;
  if (zone === "b") return plan.price_zone_b;
  return plan.price_default;
};
