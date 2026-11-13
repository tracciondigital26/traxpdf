import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getServerEnv(key: string): Promise<string | undefined> {
  // 1. Check Node process.env
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  // 2. Check Cloudflare Worker env context (secrets & vars)
  try {
    const ctx = await getCloudflareContext({ async: true });
    const cfVal = (ctx?.env as Record<string, unknown>)?.[key];
    if (typeof cfVal === "string" && cfVal) {
      return cfVal;
    }
  } catch {
    // Not running inside Cloudflare or during static build
  }

  return undefined;
}

export async function isStripeConfigured(): Promise<boolean> {
  const key = await getServerEnv("STRIPE_SECRET_KEY");
  return Boolean(key && key.startsWith("sk_"));
}
