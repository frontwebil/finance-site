"use client";

import { useEffect, useState } from "react";
import { formatKyivTime } from "@/lib/kyiv-time";
import type { LogDto, LogLevel } from "./types";

type BroadcastLogsProps = {
  schedules: Array<{ id: string; title: string }>;
  refreshKey: number;
};

type LogsResponse = { logs: LogDto[]; nextBefore: number | null };

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: "інфо",
  warn: "увага",
  error: "помилка",
};

function logsUrl(scheduleId: string, level: string, before?: number) {
  const params = new URLSearchParams();
  if (scheduleId) params.set("scheduleId", scheduleId);
  if (level) params.set("level", level);
  if (before) params.set("before", String(before));
  return `/api/admin/broadcasts/logs?${params.toString()}`;
}

async function fetchLogs(url: string): Promise<LogsResponse> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Не вдалося завантажити журнал");
  return response.json();
}

export default function BroadcastLogs({ schedules, refreshKey }: BroadcastLogsProps) {
  const [scheduleId, setScheduleId] = useState("");
  const [level, setLevel] = useState("");
  const [logs, setLogs] = useState<LogDto[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchLogs(logsUrl(scheduleId, level))
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs);
        setNextBefore(data.nextBefore);
        setError("");
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleId, level, refreshKey]);

  const loadMore = async () => {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const data = await fetchLogs(logsUrl(scheduleId, level, nextBefore));
      setLogs((current) => [...(current ?? []), ...data.logs]);
      setNextBefore(data.nextBefore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Помилка");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="panel bc-logs" aria-label="Журнал розсилок">
      <div className="panel__header bc-logs__header">
        <h2>Журнал</h2>
        <div className="bc-logs__filters">
          <select
            aria-label="Фільтр за розсилкою"
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
          >
            <option value="">Усі розсилки</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Фільтр за рівнем"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">Усі рівні</option>
            <option value="info">Інфо</option>
            <option value="warn">Увага</option>
            <option value="error">Помилки</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="bc-error" role="alert">
          {error}
        </p>
      )}

      {logs === null ? (
        <p className="bc-empty" aria-busy="true">
          Завантаження журналу...
        </p>
      ) : logs.length === 0 ? (
        <p className="bc-empty">Записів поки немає.</p>
      ) : (
        <ol className="bc-logs__list">
          {logs.map((log) => (
            <li key={log.id} className={`bc-log bc-log--${log.level}`}>
              <time className="bc-log__time" dateTime={log.createdAt}>
                {formatKyivTime(new Date(log.createdAt))}
              </time>
              <span className="bc-log__level">{LEVEL_LABELS[log.level] ?? log.level}</span>
              <div className="bc-log__body">
                <p>{log.message}</p>
                {log.details?.topErrors && log.details.topErrors.length > 0 && (
                  <ul className="bc-log__errors">
                    {log.details.topErrors.map((item) => (
                      <li key={item.description}>
                        {item.description} ×{item.count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {nextBefore && (
        <button type="button" className="bc-secondary" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Завантаження..." : "Показати ще"}
        </button>
      )}
    </section>
  );
}
