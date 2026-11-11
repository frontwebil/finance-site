import Image from "next/image";
import { WEB_APP_URL, type Offer } from "@/data/offers";
import "./OfferCard.css";

type OfferCardProps = {
  offer: Offer;
  preload?: boolean;
};

export default function OfferCard({ offer, preload = false }: OfferCardProps) {
  return (
    <article className="offer-card">
      <div className="offer-card__top">
        {offer.badge && (
          <span
            className={
              offer.badgeBlue
                ? "offer-card__badge offer-card__badge--blue"
                : "offer-card__badge"
            }
          >
            {offer.badge}
          </span>
        )}
        <Image
          className="offer-card__logo"
          src={offer.logo}
          alt={offer.alt}
          width={240}
          height={80}
          preload={preload}
        />
        <div className="offer-card__sum">{offer.sum}</div>
        <div className="offer-card__rate">{offer.rate}</div>
      </div>
      <a
        className="offer-card__btn"
        href={WEB_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Отримати →
      </a>
    </article>
  );
}
