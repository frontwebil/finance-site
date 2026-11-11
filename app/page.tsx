import Header from "@/components/Header";
import OfferGrid from "@/components/OfferGrid";
import Disclaimer from "@/components/Disclaimer";
import { offers } from "@/data/offers";
import styles from "./page.module.css";

export default function Page() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <h1 className={styles.title}>Кредит онлайн</h1>
        <OfferGrid offers={offers} />
        <Disclaimer />
      </main>
    </>
  );
}
