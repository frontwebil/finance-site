import { Suspense } from "react";
import { connection } from "next/server";
import AdminBroadcastsPage from "@/components/AdminBroadcasts/page";
import type { ScheduleDto } from "@/components/AdminBroadcasts/types";
import { getCronLastCalledAt, listSchedulesWithLastRun } from "@/lib/broadcast-schedules";

export default function BroadcastsPage() {
  return (
    <Suspense fallback={<main aria-busy="true">Завантаження розсилок...</main>}>
      <AdminBroadcastsData />
    </Suspense>
  );
}

async function AdminBroadcastsData() {
  await connection();
  const [schedules, cronLastCalledAt] = await Promise.all([
    listSchedulesWithLastRun(),
    getCronLastCalledAt(),
  ]);

  return (
    <AdminBroadcastsPage
      initialSchedules={JSON.parse(JSON.stringify(schedules)) as ScheduleDto[]}
      initialCronLastCalledAt={cronLastCalledAt?.toISOString() ?? null}
    />
  );
}
