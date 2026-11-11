import Header from "@/components/Header";
import OfferGrid from "@/components/OfferGrid";
import Disclaimer from "@/components/Disclaimer";
import { offers } from "@/data/offers";
import "./page.css";

export default function Page() {
  return (
    <>
      <Header />
      <main className="page">
        <h1 className="page__title">Кредит онлайн</h1>
        <OfferGrid offers={offers} />
        <Disclaimer />
      </main>
    </>
  );
}
