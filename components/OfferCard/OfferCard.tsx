import Image from "next/image";
import { WEB_APP_URL, type Offer } from "@/data/offers";
import "./OfferCard.css";

export type ManagedOffer = {
  id: string;
  name: string;
  logoUrl: string;
  maxAmount: number;
  minRate: number;
  currency: string;
  promoText: string | null;
  buttonText: string;
  affiliateUrl: string;
};

type OfferCardProps = {
  offer: Offer | ManagedOffer;
  preload?: boolean;
};

export default function OfferCard({ offer, preload = false }: OfferCardProps) {
  const isManagedOffer = "logoUrl" in offer;
  const logo = isManagedOffer ? offer.logoUrl : offer.logo;
  const alt = isManagedOffer ? offer.name : offer.alt;
  const sum = isManagedOffer
    ? `до ${offer.maxAmount.toLocaleString("uk-UA")} ${offer.currency}`
    : offer.sum;
  const rate = isManagedOffer ? `від ${offer.minRate}%` : offer.rate;
  const badge = isManagedOffer ? offer.promoText : offer.badge;
  const href = isManagedOffer ? offer.affiliateUrl : WEB_APP_URL;
  const buttonText = isManagedOffer ? offer.buttonText : "Отримати →";

  return (
    <article className="offer-card">
      <div className="offer-card__top">
        {badge && (
          <span
            className={!isManagedOffer && offer.badgeBlue
              ? "offer-card__badge offer-card__badge--blue"
              : "offer-card__badge"}
          >
            {badge}
          </span>
        )}
        {logo && (
          <Image
            className="offer-card__logo"
            src={logo}
            alt={alt}
            width={240}
            height={80}
            preload={preload}
            unoptimized={isManagedOffer}
          />
        )}
        <div className="offer-card__sum">{sum}</div>
        <div className="offer-card__rate">{rate}</div>
      </div>
      <a
        className="offer-card__btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {buttonText}
      </a>
    </article>
  );
}
