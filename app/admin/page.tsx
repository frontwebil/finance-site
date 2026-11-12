import { Suspense } from "react";
import { connection } from "next/server";
import AdminDashboardPage from "@/components/AdminDashboard/page";
import prisma from "@/lib/prisma";

export default function page() {
  return (
    <Suspense fallback={<main aria-busy="true">Завантаження статистики...</main>}>
      <AdminDashboardData />
    </Suspense>
  );
}

async function AdminDashboardData() {
  await connection();

  const now = new Date();

  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, users24h, users7d] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        createdAt: {
          gte: last24Hours,
        },
      },
    }),

    prisma.user.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    }),
  ]);
  return <AdminDashboardPage data={{ totalUsers, users24h, users7d }} />;
}
