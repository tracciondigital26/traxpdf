import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/env";
import { readDbAsync, writeDbAsync } from "@/lib/server/store";
import { verifyStripeWebhookSignature } from "@/lib/server/stripe";
import type { BillingCycle, PlanTier, PurchaseRecord } from "@/lib/types";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export async function POST(req: Request) {
  const webhookSecret = await getServerEnv("STRIPE_WEBHOOK_SECRET");
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (webhookSecret) {
    const isValid = await verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = await readDbAsync();
  let dbChanged = false;

  switch (event.type) {
    case "checkout.session.completed": {
      const sessionObj = event.data.object as {
        id?: string;
        customer?: string;
        subscription?: string;
        mode?: string;
        created?: number;
        amount_total?: number;
        currency?: string;
        metadata?: {
          userId?: string;
          kind?: string;
          tier?: PlanTier;
          cycle?: BillingCycle;
          packId?: string;
          credits?: string;
        };
      };

      const meta = sessionObj.metadata || {};
      const userId = meta.userId;
      if (!userId || !db.users[userId]) break;

      const user = db.users[userId];
      if (!user.purchases) user.purchases = [];

      // Deduplicate if already handled
      if (sessionObj.id && user.purchases.some((p) => p.id === sessionObj.id)) {
        break;
      }

      if (sessionObj.customer && typeof sessionObj.customer === "string") {
        user.stripeCustomerId = sessionObj.customer;
      }

      let addedCredits = 0;
      let description = "Compra TraxPDF";

      if (meta.kind === "credits") {
        addedCredits = Number(meta.credits) || 0;
        user.credits += addedCredits;
        description = `Paquete de ${addedCredits} Créditos PDF`;
        dbChanged = true;
      } else if (
        meta.kind === "subscription" &&
        (meta.tier === "pro" || meta.tier === "pro_cloud")
      ) {
        user.plan = meta.tier;
        user.billingCycle = meta.cycle || "monthly";
        user.proExpiresAt = null; // paid plan is not a temporary promo
        if (sessionObj.subscription && typeof sessionObj.subscription === "string") {
          user.stripeSubscriptionId = sessionObj.subscription;
        }
        description = `Suscripción ${user.plan === "pro_cloud" ? "Pro+ Nube" : "Pro Ilimitado"} (${user.billingCycle === "annual" ? "Anual" : "Mensual"})`;
        dbChanged = true;
      }

      if (sessionObj.id) {
        const purchase: PurchaseRecord = {
          id: sessionObj.id,
          date: new Date((sessionObj.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          description,
          amount: (sessionObj.amount_total ?? 0) / 100,
          currency: (sessionObj.currency ?? "usd").toUpperCase(),
          kind: (meta.kind as "credits" | "subscription") || "credits",
          credits: addedCredits || undefined,
          status: "completed",
        };
        user.purchases = [purchase, ...user.purchases];
        dbChanged = true;
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subObj = event.data.object as {
        id?: string;
        customer?: string;
      };

      const subId = subObj.id;
      const custId = subObj.customer;

      for (const user of Object.values(db.users)) {
        if (
          (subId && user.stripeSubscriptionId === subId) ||
          (custId && user.stripeCustomerId === custId)
        ) {
          user.plan = "free";
          user.stripeSubscriptionId = null;
          dbChanged = true;
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subObj = event.data.object as {
        id?: string;
        customer?: string;
        status?: string;
        metadata?: {
          tier?: PlanTier;
          cycle?: BillingCycle;
        };
      };

      const subId = subObj.id;
      const custId = subObj.customer;
      const status = subObj.status;

      for (const user of Object.values(db.users)) {
        if (
          (subId && user.stripeSubscriptionId === subId) ||
          (custId && user.stripeCustomerId === custId)
        ) {
          if (status === "canceled" || status === "unpaid") {
            user.plan = "free";
            user.stripeSubscriptionId = null;
            dbChanged = true;
          } else if (
            status === "active" &&
            (subObj.metadata?.tier === "pro" || subObj.metadata?.tier === "pro_cloud")
          ) {
            user.plan = subObj.metadata.tier;
            if (subObj.metadata.cycle) user.billingCycle = subObj.metadata.cycle;
            dbChanged = true;
          }
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      // Re-confirm subscription status on successful automatic renewal
      const invoiceObj = event.data.object as {
        customer?: string;
        subscription?: string;
      };
      const custId = invoiceObj.customer;
      const subId = invoiceObj.subscription;

      if (custId || subId) {
        for (const user of Object.values(db.users)) {
          if (
            (subId && user.stripeSubscriptionId === subId) ||
            (custId && user.stripeCustomerId === custId)
          ) {
            user.proExpiresAt = null;
            dbChanged = true;
          }
        }
      }
      break;
    }

    default:
      // Other events are acknowledged
      break;
  }

  if (dbChanged) {
    await writeDbAsync(db);
  }

  return NextResponse.json({ received: true });
}
