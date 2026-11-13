import type { BillingCycle, PlanTier } from "../types";

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  kind: "credits" | "subscription";
  tier?: PlanTier;
  cycle?: BillingCycle;
  packId?: string;
  credits?: number;
  amountCents: number;
  lineTitle: string;
  origin: string;
  stripeCustomerId?: string | null;
}

export async function createStripeCheckoutSession(
  secretKey: string,
  params: CreateCheckoutParams,
): Promise<{ url: string }> {
  const body = new URLSearchParams();
  const isSub = params.kind === "subscription";

  body.set("mode", isSub ? "subscription" : "payment");
  body.set("success_url", `${params.origin}/?checkout=success`);
  body.set("cancel_url", `${params.origin}/?checkout=cancelled`);

  if (params.stripeCustomerId) {
    body.set("customer", params.stripeCustomerId);
  } else if (params.email) {
    body.set("customer_email", params.email);
  }

  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(params.amountCents));
  body.set("line_items[0][price_data][product_data][name]", params.lineTitle);

  if (isSub) {
    body.set(
      "line_items[0][price_data][recurring][interval]",
      params.cycle === "annual" ? "year" : "month",
    );
  }

  // Metadata for webhook fulfillment
  body.set("metadata[userId]", params.userId);
  body.set("metadata[kind]", params.kind);
  if (params.tier) body.set("metadata[tier]", params.tier);
  if (params.cycle) body.set("metadata[cycle]", params.cycle);
  if (params.packId) body.set("metadata[packId]", params.packId);
  if (params.credits) body.set("metadata[credits]", String(params.credits));

  // If subscription, also attach metadata to the subscription object
  if (isSub) {
    body.set("subscription_data[metadata][userId]", params.userId);
    if (params.tier) body.set("subscription_data[metadata][tier]", params.tier);
    if (params.cycle) body.set("subscription_data[metadata][cycle]", params.cycle);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    throw new Error(data.error?.message || "Stripe checkout session creation failed");
  }

  return { url: data.url };
}

export async function createStripePortalSession(
  secretKey: string,
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const body = new URLSearchParams();
  body.set("customer", customerId);
  body.set("return_url", returnUrl);

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    throw new Error(data.error?.message || "Stripe billing portal session creation failed");
  }

  return { url: data.url };
}

export async function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [k, v] = part.trim().split("=");
    if (k === "t") timestamp = v;
    if (k === "v1") signatures.push(v);
  }

  if (!timestamp || signatures.length === 0) return false;

  const tsNum = Number(timestamp);
  if (isNaN(tsNum)) return false;

  // Replay attack prevention: 5 min window
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((s) => timingSafeStringEqual(s, expectedSig));
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
