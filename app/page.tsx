import { Suspense } from "react";
import { connection } from "next/server";
import Header from "@/components/Header";
import OfferGrid from "@/components/OfferGrid";
import Disclaimer from "@/components/Disclaimer";
import { offers } from "@/data/offers";
import prisma from "@/lib/prisma";
import "./page.css";

export default function Page() {
  return (
    <>
      <Header />
      <main className="page">
        <h1 className="page__title">Кредит онлайн</h1>
        <Suspense fallback={<OfferGrid offers={offers} />}>
          <ManagedOfferGrid />
        </Suspense>
        <Disclaimer />
      </main>
    </>
  );
}

async function ManagedOfferGrid() {
  await connection();
  const managedOffers = await prisma.offer.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return <OfferGrid offers={managedOffers.length ? managedOffers : offers} />;
}
