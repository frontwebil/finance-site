import type { ButtonType } from "@/lib/broadcast-validation";

export type RunStatus = "running" | "done" | "failed" | "skipped";

export type RunDto = {
  id: string;
  status: RunStatus;
  scheduledFor: string;
  sent: number;
  failed: number;
  finishedAt: string | null;
};

export type ScheduleDto = {
  id: string;
  title: string;
  message: string;
  buttonType: ButtonType;
  buttonText: string | null;
  buttonUrl: string | null;
  sendTime: string;
  isActive: boolean;
  nextRunAt: string | null;
  lastRun: RunDto | null;
};

export type LogLevel = "info" | "warn" | "error";

export type LogDto = {
  id: number;
  createdAt: string;
  level: LogLevel;
  message: string;
  scheduleId: string | null;
  details: { topErrors?: Array<{ description: string; count: number }> } | null;
};
