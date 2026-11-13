"use client";

import { useCallback, useEffect, useState } from "react";
import LogoutButton from "@/components/AdminDashboard/LogoutButton";
import AdminSidebar from "@/components/AdminSidebar/AdminSidebar";
import type { ScheduleInput } from "@/lib/broadcast-validation";
import { formatKyivTime } from "@/lib/kyiv-time";
import BroadcastForm from "./BroadcastForm";
import BroadcastLogs from "./BroadcastLogs";
import type { RunDto, ScheduleDto } from "./types";
import "@/components/AdminDashboard/page.css";
import "@/components/AdminUsers/style.css";
import "./style.css";

const REFRESH_INTERVAL_MS = 15_000;
const CRON_ALIVE_MS = 3 * 60 * 1000;

type AdminBroadcastsPageProps = {
  initialSchedules: ScheduleDto[];
  initialCronLastCalledAt: string | null;
};

function formatAgo(diffMs: number): string {
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} хв`;
  return `${Math.round(minutes / 60)} год`;
}

function cronStatus(lastCalledAt: string | null, now: number) {
  if (!lastCalledAt) {
    return {
      ok: false,
      text: "⚠ Cron ще жодного разу не викликав сайт — налаштуйте cron-job.org",
    };
  }
  const diff = now - Date.parse(lastCalledAt);
  return diff < CRON_ALIVE_MS
    ? { ok: true, text: `● Cron активний — останній виклик ${formatAgo(diff)} тому` }
    : { ok: false, text: `⚠ Cron не викликав сайт ${formatAgo(diff)} — перевірте cron-job.org` };
}

function runSummary(run: RunDto): string {
  const when = formatKyivTime(new Date(run.scheduledFor));
  switch (run.status) {
    case "done":
      return `${when} — ✓ ${run.sent} / ✗ ${run.failed}`;
    case "running":
      return `${when} — ⏳ відправляється, оброблено ${run.sent + run.failed}`;
    case "failed":
      return `${when} — ✗ зупинено (✓ ${run.sent} / ✗ ${run.failed}), деталі в журналі`;
    case "skipped":
      return `${when} — пропущено`;
  }
}

function toInput(schedule: ScheduleDto): ScheduleInput {
  return {
    title: schedule.title,
    sendTime: schedule.sendTime,
    isActive: schedule.isActive,
    message: schedule.message,
    buttonType: schedule.buttonType,
    buttonText: schedule.buttonText,
    buttonUrl: schedule.buttonUrl,
    photoUrl: schedule.photoUrl,
  };
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Не вдалося виконати дію");
  }
  return data;
}

export default function AdminBroadcastsPage({
  initialSchedules,
  initialCronLastCalledAt,
}: AdminBroadcastsPageProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [cronLastCalledAt, setCronLastCalledAt] = useState(initialCronLastCalledAt);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState<ScheduleDto | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [logsVersion, setLogsVersion] = useState(0);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/broadcasts", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        schedules: ScheduleDto[];
        cronLastCalledAt: string | null;
      };
      setSchedules(data.schedules);
      setCronLastCalledAt(data.cronLastCalledAt);
    } finally {
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
      setLogsVersion((version) => version + 1);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const afterChange = async () => {
    await refresh();
    setLogsVersion((version) => version + 1);
  };

  const saveSchedule = async (values: ScheduleInput) => {
    if (editing && editing !== "new") {
      await requestJson(`/api/admin/broadcasts/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
    } else {
      await requestJson("/api/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify(values),
      });
    }
    setEditing(null);
    await afterChange();
  };

  const runAction = async (schedule: ScheduleDto, action: () => Promise<unknown>) => {
    setBusyId(schedule.id);
    setError("");
    try {
      await action();
      await afterChange();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не вдалося виконати дію");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSchedule = (schedule: ScheduleDto) =>
    runAction(schedule, () =>
      requestJson(`/api/admin/broadcasts/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...toInput(schedule), isActive: !schedule.isActive }),
      }),
    );

  // Two-step in-page confirmation instead of window.confirm(), which some embedded browsers block.
  const deleteSchedule = (schedule: ScheduleDto) => {
    if (confirmDeleteId !== schedule.id) {
      setConfirmDeleteId(schedule.id);
      return;
    }
    setConfirmDeleteId(null);
    void runAction(schedule, () =>
      requestJson(`/api/admin/broadcasts/${schedule.id}`, { method: "DELETE" }),
    );
  };

  const status = cronStatus(cronLastCalledAt, now);

  return (
    <main className="dashboard-page bc-page">
      <AdminSidebar active="broadcasts" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Керування</p>
            <h1>Розсилки</h1>
          </div>
          <div className="users-header-actions">
            <button type="button" className="bc-primary" onClick={() => setEditing("new")}>
              + Нова розсилка
            </button>
            <LogoutButton />
          </div>
        </header>

        <p
          className={status.ok ? "bc-cron bc-cron--ok" : "bc-cron bc-cron--warn"}
          role="status"
          suppressHydrationWarning
        >
          {status.text}
        </p>

        {error && (
          <p className="bc-error" role="alert">
            {error}
          </p>
        )}

        <section className="panel bc-list" aria-label="Щоденні розсилки">
          <div className="panel__header">
            <h2>Щоденні розсилки</h2>
            <span>Час за Києвом</span>
          </div>

          {schedules.length === 0 ? (
            <p className="bc-empty">
              Ще немає розсилок. Створіть першу — вона відправлятиметься щодня у вказаний час.
            </p>
          ) : (
            <ul className="bc-cards">
              {schedules.map((schedule) => (
                <li key={schedule.id} className="bc-card">
                  <div className="bc-card__main">
                    <div className="bc-card__title">
                      <strong>{schedule.title}</strong>
                      <span className="bc-card__time">{schedule.sendTime} щодня</span>
                      {schedule.photoUrl && <span className="bc-card__badge">📷 з фото</span>}
                    </div>
                    <p className="bc-card__meta">
                      {schedule.isActive && schedule.nextRunAt
                        ? `Наступна: ${formatKyivTime(new Date(schedule.nextRunAt))}`
                        : "Вимкнено"}
                    </p>
                    <p className="bc-card__meta">
                      Останній запуск: {schedule.lastRun ? runSummary(schedule.lastRun) : "ще не було"}
                    </p>
                    {confirmDeleteId === schedule.id && (
                      <p className="bc-card__confirm" role="alert">
                        Натисніть «Так, видалити», щоб видалити «{schedule.title}».
                        {schedule.lastRun?.status === "running" &&
                          " Відправка, що зараз триває, буде зупинена."}
                      </p>
                    )}
                  </div>
                  <div className="bc-card__actions">
                    <label className="bc-switch">
                      <input
                        type="checkbox"
                        checked={schedule.isActive}
                        onChange={() => void toggleSchedule(schedule)}
                        disabled={busyId === schedule.id}
                      />
                      {schedule.isActive ? "Увімкнено" : "Вимкнено"}
                    </label>
                    <button
                      type="button"
                      className="bc-secondary"
                      onClick={() => setEditing(schedule)}
                      disabled={busyId === schedule.id}
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      className="bc-danger"
                      onClick={() => deleteSchedule(schedule)}
                      disabled={busyId === schedule.id}
                    >
                      {confirmDeleteId === schedule.id ? "Так, видалити" : "Видалити"}
                    </button>
                    {confirmDeleteId === schedule.id && (
                      <button
                        type="button"
                        className="bc-secondary"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Скасувати
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <BroadcastLogs
          schedules={schedules.map(({ id, title }) => ({ id, title }))}
          refreshKey={logsVersion}
        />
      </section>

      {editing && (
        <BroadcastForm
          initial={editing === "new" ? undefined : toInput(editing)}
          onSubmit={saveSchedule}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
