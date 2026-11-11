import type { Offer } from "@/data/offers";
import OfferCard from "@/components/OfferCard";
import styles from "./OfferGrid.module.css";

type OfferGridProps = {
  offers: Offer[];
};

export default function OfferGrid({ offers }: OfferGridProps) {
  return (
    <section className={styles.grid}>
      {offers.map((offer, i) => (
        <OfferCard key={offer.id} offer={offer} preload={i < 3} />
      ))}
    </section>
  );
}
