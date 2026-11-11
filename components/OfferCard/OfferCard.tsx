import Image from "next/image";
import { WEB_APP_URL, type Offer } from "@/data/offers";
import styles from "./OfferCard.module.css";

type OfferCardProps = {
  offer: Offer;
  preload?: boolean;
};

export default function OfferCard({ offer, preload = false }: OfferCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        {offer.badge && (
          <span
            className={
              offer.badgeBlue ? `${styles.badge} ${styles.badgeBlue}` : styles.badge
            }
          >
            {offer.badge}
          </span>
        )}
        <Image
          className={styles.logo}
          src={offer.logo}
          alt={offer.alt}
          width={240}
          height={80}
          preload={preload}
        />
        <div className={styles.sum}>{offer.sum}</div>
        <div className={styles.rate}>{offer.rate}</div>
      </div>
      <a
        className={styles.btn}
        href={WEB_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Отримати →
      </a>
    </article>
  );
}
