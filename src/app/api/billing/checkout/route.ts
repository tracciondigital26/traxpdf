import { NextResponse } from "next/server";
import { CREDIT_PACKS, getPlanPriceCents, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import type { BillingCycle } from "@/lib/types";

type CheckoutBody =
  | { kind: "credits"; packId: "pack_10" | "pack_25" | "pack_55" }
  | { kind: "subscription"; tier: "pro" | "pro_cloud"; cycle: BillingCycle };

export async function POST(req: Request) {
  const { session } = await getOrCreateSession();
  if (!session.authenticated) {
    return NextResponse.json(
      { error: "Please create a free account or sign in before purchasing." },
      { status: 401 },
    );
  }

  const body = (await req.json()) as CheckoutBody;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // Validate payload
  let lineTitle = "";
  let amountCents = 0;
  let mode: "payment" | "subscription" = "payment";

  if (body.kind === "credits") {
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
    }
    lineTitle = `TraxPDF Wallet - ${pack.credits} PDF Credits ($0.20/PDF)`;
    amountCents = pack.priceCents;
    mode = "payment";
  } else if (body.kind === "subscription") {
    if (!SUBSCRIPTION_PLANS[body.tier]) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }
    const cycle: BillingCycle = body.cycle === "annual" ? "annual" : "monthly";
    lineTitle =
      body.tier === "pro_cloud"
        ? `TraxPDF Pro+ Cloud (${cycle})`
        : `TraxPDF Pro Unlimited (${cycle})`;
    amountCents = getPlanPriceCents(body.tier, cycle);
    mode = "subscription";
  } else {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  // If real Stripe Secret Key is configured, create a Stripe Checkout Session via REST API
  if (stripeKey) {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("success_url", `${origin}/?checkout=success`);
    params.set("cancel_url", `${origin}/?checkout=cancelled`);
    params.set("customer_email", session.email || "");
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(amountCents));
    params.set("line_items[0][price_data][product_data][name]", lineTitle);
    if (mode === "subscription" && body.kind === "subscription") {
      params.set(
        "line_items[0][price_data][recurring][interval]",
        body.cycle === "annual" ? "year" : "month",
      );
    }
    params.set("metadata[userId]", session.userId);
    params.set("metadata[kind]", body.kind);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripeData = (await stripeRes.json()) as { url?: string; error?: { message?: string } };
    if (!stripeRes.ok || !stripeData.url) {
      return NextResponse.json(
        { error: stripeData.error?.message || "Stripe checkout failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ mode: "stripe", checkoutUrl: stripeData.url });
  }

  // Instant Test / Demo Checkout when STRIPE_SECRET_KEY is not set
  const db = await readDbAsync();
  const user = db.users[session.userId];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.kind === "credits") {
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId)!;
    user.credits += pack.credits;
  } else if (body.kind === "subscription") {
    user.plan = body.tier;
    user.billingCycle = body.cycle === "annual" ? "annual" : "monthly";
  }

  await writeDbAsync(db);
  const { session: updatedSession } = await getOrCreateSession();

  return NextResponse.json({
    mode: "demo",
    ok: true,
    session: updatedSession,
  });
}
