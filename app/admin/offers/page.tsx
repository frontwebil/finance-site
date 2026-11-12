import { Suspense } from "react";
import { connection } from "next/server";
import AdminOffersPage from "@/components/AdminOffers/page";
import prisma from "@/lib/prisma";

export default function OffersPage() {
  return (
    <Suspense fallback={<main aria-busy="true">Завантаження оферів...</main>}>
      <AdminOffersData />
    </Suspense>
  );
}

async function AdminOffersData() {
  await connection();
  const offers = await prisma.offer.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return <AdminOffersPage initialOffers={offers} />;
}
