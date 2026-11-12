import type { Offer } from "@/data/offers";
import OfferCard, { type ManagedOffer } from "@/components/OfferCard/OfferCard";
import "./OfferGrid.css";

type OfferGridProps = {
  offers: Array<Offer | ManagedOffer>;
};

export default function OfferGrid({ offers }: OfferGridProps) {
  return (
    <section className="offer-grid">
      {offers.map((offer, i) => (
        <OfferCard key={offer.id} offer={offer} preload={i < 3} />
      ))}
    </section>
  );
}
