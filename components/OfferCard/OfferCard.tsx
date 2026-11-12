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
  const buttonText = isManagedOffer ? offer.buttonText : "Отримати гроші";

  return (
    <article className="offer-card">
      {badge && (
        <span
          className={!isManagedOffer && offer.badgeBlue
            ? "offer-card__badge offer-card__badge--blue"
            : "offer-card__badge"}
        >
          {badge}
        </span>
      )}
      <div className="offer-card__top">
        <div className="offer-card__logo-wrap">
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
        </div>
        <div className="offer-card__info">
          <div className="offer-card__label">Сума:</div>
          <div className="offer-card__value">{sum}</div>
          <div className="offer-card__label">Відсоток:</div>
          <div className="offer-card__value">{rate}</div>
        </div>
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
