export type OfferPayload = {
  name: string;
  logoUrl: string;
  maxAmount: number;
  minRate: number;
  currency: string;
  promoText: string | null;
  buttonText: string;
  affiliateUrl: string;
  isActive: boolean;
  order: number;
};

export function parseOfferPayload(value: unknown): OfferPayload | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const logoUrl = typeof input.logoUrl === "string" ? input.logoUrl.trim() : "";
  const currency =
    typeof input.currency === "string" ? input.currency.trim() : "";
  const buttonText =
    typeof input.buttonText === "string" ? input.buttonText.trim() : "";
  const affiliateUrl =
    typeof input.affiliateUrl === "string" ? input.affiliateUrl.trim() : "";
  const promoText =
    typeof input.promoText === "string" ? input.promoText.trim() : "";
  const maxAmount = input.maxAmount;
  const minRate = input.minRate;
  const order = input.order;
  const isActive = input.isActive;

  let logo: URL;
  let affiliate: URL;
  try {
    logo = new URL(logoUrl);
    affiliate = new URL(affiliateUrl);
  } catch {
    return null;
  }

  if (
    !name ||
    name.length > 120 ||
    logo.protocol !== "https:" ||
    logo.hostname !== "res.cloudinary.com" ||
    !Number.isSafeInteger(maxAmount) ||
    (maxAmount as number) < 1 ||
    typeof minRate !== "number" ||
    !Number.isFinite(minRate) ||
    minRate < 0 ||
    !currency ||
    currency.length > 8 ||
    buttonText.length === 0 ||
    buttonText.length > 40 ||
    (promoText.length > 80) ||
    (input.promoText !== null && typeof input.promoText !== "string") ||
    !["https:", "http:"].includes(affiliate.protocol) ||
    typeof isActive !== "boolean" ||
    !Number.isSafeInteger(order) ||
    (order as number) < 0
  ) {
    return null;
  }

  return {
    name,
    logoUrl,
    maxAmount: maxAmount as number,
    minRate,
    currency,
    promoText: promoText || null,
    buttonText,
    affiliateUrl,
    isActive,
    order: order as number,
  };
}
