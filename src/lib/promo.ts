export interface PromoDefinition {
  code: string;
  aliases: string[];
  title: string;
  description: string;
  durationMonths: number | null; // null = lifetime
  claimDeadline: string | null; // ISO string, e.g. "2026-12-31T23:59:59-06:00"
}

export const PROMO_DEFINITIONS: Record<string, PromoDefinition> = {
  "TRAX-BETA": {
    code: "TRAX-BETA",
    aliases: ["TRAXBETA", "BETA2026", "TRAX_BETA", "BETATRAX"],
    title: "Acceso Beta Pro (30 días)",
    description: "30 días de acceso Pro Ilimitado durante la fase Beta.",
    durationMonths: 1,
    claimDeadline: "2026-12-31T23:59:59-06:00",
  },
  TRAX3MESES: {
    code: "TRAX3MESES",
    aliases: ["PRO3MESES", "LANZAMIENTO2026", "TRAX3M"],
    title: "3 Meses Pro Gratis",
    description: "3 meses de Pro Ilimitado sin costo.",
    durationMonths: 3,
    claimDeadline: "2026-12-31T23:59:59-06:00",
  },
  TRAX1MES: {
    code: "TRAX1MES",
    aliases: ["PRO1MES", "1MESGRATIS", "TRAX1M"],
    title: "1 Mes Pro Gratis",
    description: "1 mes de Pro Ilimitado sin costo. Reclamable en cualquier fecha.",
    durationMonths: 1,
    claimDeadline: null, // Sin fecha límite de canje
  },
  AMIGOSVIP: {
    code: "AMIGOSVIP",
    aliases: ["TRAXVIP", "VIPLIFETIME", "CONOCIDOSVIP"],
    title: "Pro de por Vida (VIP)",
    description: "Acceso Pro Ilimitado permanente de por vida sin vencimiento.",
    durationMonths: null, // De por vida
    claimDeadline: null,
  },
};

export interface PromoEvaluation {
  valid: boolean;
  error?: string;
  promo?: PromoDefinition;
  proExpiresAt?: string | null; // ISO date or null for lifetime
}

export function evaluatePromoCode(rawCode: string | undefined | null): PromoEvaluation {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: "Ingresa un código promocional válido." };
  }

  const clean = rawCode.trim().toUpperCase().replace(/[\s-_]/g, "");

  // Match main code or aliases
  let matchedPromo: PromoDefinition | undefined;
  for (const promo of Object.values(PROMO_DEFINITIONS)) {
    if (
      promo.code.toUpperCase() === clean ||
      promo.aliases.some((a) => a.toUpperCase() === clean)
    ) {
      matchedPromo = promo;
      break;
    }
  }

  if (!matchedPromo) {
    return {
      valid: false,
      error: "Código promocional no válido o inexistente.",
    };
  }

  // Check deadline if applicable
  if (matchedPromo.claimDeadline) {
    const deadlineTime = new Date(matchedPromo.claimDeadline).getTime();
    if (Date.now() > deadlineTime) {
      return {
        valid: false,
        error: "Esta promoción ya no se encuentra disponible.",
      };
    }
  }

  // Compute expiration date
  let proExpiresAt: string | null = null;
  if (matchedPromo.durationMonths !== null) {
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + matchedPromo.durationMonths);
    proExpiresAt = expiresDate.toISOString();
  }

  return {
    valid: true,
    promo: matchedPromo,
    proExpiresAt,
  };
}
