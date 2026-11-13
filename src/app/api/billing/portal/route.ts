import { NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/server/auth";
import { getServerEnv } from "@/lib/server/env";
import { readDbAsync } from "@/lib/server/store";
import { createStripePortalSession } from "@/lib/server/stripe";

export async function POST(req: Request) {
  const { session } = await getOrCreateSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Please sign in to access the billing portal." }, { status: 401 });
  }

  const stripeKey = await getServerEnv("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe is not configured on this environment." }, { status: 400 });
  }

  const db = await readDbAsync();
  const user = db.users[session.userId];
  if (!user || !user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active Stripe customer found. Please subscribe or purchase first." },
      { status: 404 },
    );
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://traxpdf.tracciondigital.com.mx";

  try {
    const portal = await createStripePortalSession(stripeKey, user.stripeCustomerId, `${origin}/`);
    return NextResponse.json({ portalUrl: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
