import type { BillingCycle, PlanTier } from "./types";

export const DAILY_LIMITS: Record<PlanTier, number | null> = {
  guest: 1,
  free: 3,
  pro: null,
  pro_cloud: null,
};

export const CREDIT_PRICE_CENTS = 20; // $0.20 USD per PDF

export interface CreditPack {
  id: "pack_10" | "pack_25" | "pack_55";
  credits: number;
  bonusCredits: number;
  priceCents: number;
  priceLabel: string;
  perPdfLabel: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_10",
    credits: 10,
    bonusCredits: 0,
    priceCents: 200,
    priceLabel: "$2.00",
    perPdfLabel: "$0.20 / PDF",
  },
  {
    id: "pack_25",
    credits: 25,
    bonusCredits: 0,
    priceCents: 500,
    priceLabel: "$5.00",
    perPdfLabel: "$0.20 / PDF",
    popular: true,
  },
  {
    id: "pack_55",
    credits: 55,
    bonusCredits: 5,
    priceCents: 1000,
    priceLabel: "$10.00",
    perPdfLabel: "$0.18 / PDF",
  },
];

export interface SubscriptionPlanConfig {
  tier: "pro" | "pro_cloud";
  monthlyCents: number;
  annualCents: number;
  monthlyLabel: string;
  annualLabel: string;
  annualMonthlyEquivalent: string;
  cloudEnabled: boolean;
}

export const SUBSCRIPTION_PLANS: Record<"pro" | "pro_cloud", SubscriptionPlanConfig> = {
  pro: {
    tier: "pro",
    monthlyCents: 799,
    annualCents: 5900,
    monthlyLabel: "$7.99",
    annualLabel: "$59",
    annualMonthlyEquivalent: "$4.92",
    cloudEnabled: false,
  },
  pro_cloud: {
    tier: "pro_cloud",
    monthlyCents: 1499,
    annualCents: 11900,
    monthlyLabel: "$14.99",
    annualLabel: "$119",
    annualMonthlyEquivalent: "$9.92",
    cloudEnabled: true,
  },
};

export function getPlanPriceCents(tier: "pro" | "pro_cloud", cycle: BillingCycle): number {
  const cfg = SUBSCRIPTION_PLANS[tier];
  return cycle === "annual" ? cfg.annualCents : cfg.monthlyCents;
}
