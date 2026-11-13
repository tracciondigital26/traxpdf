import { NextResponse } from "next/server";
import { AUTH_COOKIES, COOKIE_OPTIONS, createSessionToken, getOrCreateSession } from "@/lib/server/auth";
import { getServerEnv } from "@/lib/server/env";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import type { BillingCycle, PlanTier, PurchaseRecord } from "@/lib/types";

interface StripeSessionResponse {
  id: string;
  created: number;
  customer?: string | null;
  subscription?: string | null;
  payment_status: string;
  status: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  };
  metadata?: {
    userId?: string;
    kind?: "credits" | "subscription";
    tier?: PlanTier;
    cycle?: BillingCycle;
    packId?: string;
    credits?: string;
  };
}

async function handleConfirm(sessionId: string | null) {
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const stripeKey = await getServerEnv("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured on server" }, { status: 500 });
  }

  // Fetch session directly from Stripe
  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${stripeKey}`,
    },
    cache: "no-store",
  });

  if (!stripeRes.ok) {
    return NextResponse.json({ error: "Failed to retrieve Stripe session" }, { status: 404 });
  }

  const sessionData = (await stripeRes.json()) as StripeSessionResponse;

  if (sessionData.payment_status !== "paid" && sessionData.status !== "complete") {
    return NextResponse.json(
      { error: "Payment not completed yet", status: sessionData.payment_status },
      { status: 400 },
    );
  }

  const db = await readDbAsync();
  const { session: currentSession } = await getOrCreateSession();

  // Find user by session.userId, metadata.userId, or customer_details.email
  const targetUserId =
    (currentSession.authenticated ? currentSession.userId : null) ||
    sessionData.metadata?.userId ||
    (sessionData.customer_details?.email
      ? db.usersByEmail[sessionData.customer_details.email.toLowerCase()]
      : null);

  if (!targetUserId || !db.users[targetUserId]) {
    // If user is not found, return status ok with minimal info
    return NextResponse.json({
      ok: true,
      unassociated: true,
      message: "Payment verified but user account could not be linked automatically.",
    });
  }

  const user = db.users[targetUserId];
  const meta = sessionData.metadata || {};
  let addedCredits = 0;
  let description = "Compra TraxPDF";

  if (!user.purchases) {
    user.purchases = [];
  }

  const alreadyProcessed = user.purchases.some((p) => p.id === sessionData.id);

  if (!alreadyProcessed) {
    if (sessionData.customer) {
      user.stripeCustomerId = sessionData.customer;
    }

    if (meta.kind === "credits") {
      addedCredits = Number(meta.credits) || 0;
      user.credits = (user.credits || 0) + addedCredits;
      description = `Paquete de ${addedCredits} Créditos PDF`;
    } else if (meta.kind === "subscription") {
      if (meta.tier === "pro" || meta.tier === "pro_cloud") {
        user.plan = meta.tier;
        user.billingCycle = meta.cycle || "monthly";
        user.proExpiresAt = null;
        if (sessionData.subscription) {
          user.stripeSubscriptionId = sessionData.subscription;
        }
        description = `Suscripción ${user.plan === "pro_cloud" ? "Pro+ Nube" : "Pro Ilimitado"} (${user.billingCycle === "annual" ? "Anual" : "Mensual"})`;
      }
    }

    const purchase: PurchaseRecord = {
      id: sessionData.id,
      date: new Date((sessionData.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      description,
      amount: (sessionData.amount_total ?? 0) / 100,
      currency: (sessionData.currency ?? "usd").toUpperCase(),
      kind: meta.kind || "credits",
      credits: addedCredits || undefined,
      status: "completed",
    };

    user.purchases = [purchase, ...user.purchases];
    await writeDbAsync(db);
  }

  const token = createSessionToken(user);
  const res = NextResponse.json({
    ok: true,
    token,
    alreadyProcessed,
    addedCredits,
    plan: user.plan,
    credits: user.credits,
    purchases: user.purchases,
  });

  // Re-issue cookie with the updated state
  res.cookies.set(AUTH_COOKIES.SESSION_COOKIE, token, COOKIE_OPTIONS);

  return res;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    return await handleConfirm(body.sessionId ?? null);
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  return await handleConfirm(sessionId);
}
