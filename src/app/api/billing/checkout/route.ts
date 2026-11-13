import { NextResponse } from "next/server";
import { CREDIT_PACKS, getPlanPriceCents, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { getOrCreateSession } from "@/lib/server/auth";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import { createStripeCheckoutSession } from "@/lib/server/stripe";
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
  let credits = 0;

  if (body.kind === "credits") {
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
    }
    lineTitle = `TraxPDF - ${pack.credits} PDF Credits ($0.20/PDF)`;
    amountCents = pack.priceCents;
    credits = pack.credits;
  } else if (body.kind === "subscription") {
    if (!SUBSCRIPTION_PLANS[body.tier]) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }
    const cycle: BillingCycle = body.cycle === "annual" ? "annual" : "monthly";
    lineTitle =
      body.tier === "pro_cloud"
        ? `TraxPDF Pro+ Cloud (${cycle === "annual" ? "Annual" : "Monthly"})`
        : `TraxPDF Pro Unlimited (${cycle === "annual" ? "Annual" : "Monthly"})`;
    amountCents = getPlanPriceCents(body.tier, cycle);
  } else {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const db = await readDbAsync();
  const user = db.users[session.userId];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If real Stripe Secret Key is configured, create a real Stripe Checkout Session
  if (stripeKey) {
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://traxpdf.tracciondigital.com.mx";

    try {
      const stripeCheckout = await createStripeCheckoutSession(stripeKey, {
        userId: user.id,
        email: user.email,
        kind: body.kind,
        tier: body.kind === "subscription" ? body.tier : undefined,
        cycle: body.kind === "subscription" ? (body.cycle === "annual" ? "annual" : "monthly") : undefined,
        packId: body.kind === "credits" ? body.packId : undefined,
        credits: body.kind === "credits" ? credits : undefined,
        amountCents,
        lineTitle,
        origin,
        stripeCustomerId: user.stripeCustomerId,
      });

      return NextResponse.json({ mode: "stripe", checkoutUrl: stripeCheckout.url });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Stripe checkout session failed";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }
  }

  // Instant Test / Demo Checkout when STRIPE_SECRET_KEY is not set
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
