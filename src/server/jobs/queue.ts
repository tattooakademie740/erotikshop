/**
 * Auftragswarteschlange in PostgreSQL (FOR UPDATE SKIP LOCKED).
 * Mehrere Worker können parallel laufen, ohne denselben Auftrag doppelt zu bearbeiten.
 * Fehlgeschlagene Aufträge werden mit wachsendem Abstand wiederholt. Nach dem letzten
 * Versuch: Status "dead" und eine kritische Benachrichtigung, nie stilles Verschwinden.
 */
import { sql } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { nextRetryDelayMs } from "@/domain/fulfillment-state";

type DB = typeof Db;

export type JobType =
  | "supplier.import"
  | "order.paid"
  | "fulfillment.submit"
  | "tracking.check"
  | "email.send";

export async function enqueue(
  db: DB,
  type: JobType,
  payload: Record<string, unknown>,
  opts: { runAt?: Date; dedupeKey?: string; maxAttempts?: number } = {},
) {
  const rows = await db
    .insert(s.automationJobs)
    .values({
      type,
      payload,
      runAt: opts.runAt ?? new Date(),
      dedupeKey: opts.dedupeKey ?? null,
      maxAttempts: opts.maxAttempts ?? 6,
    })
    .onConflictDoNothing()
    .returning({ id: s.automationJobs.id });
  return rows[0]?.id ?? null; // null = gleicher Auftrag läuft bereits
}

export type ClaimedJob = typeof s.automationJobs.$inferSelect;

export async function claim(db: DB, limit = 10): Promise<ClaimedJob[]> {
  const res = await db.execute<ClaimedJob>(sql`
    update automation_jobs set status = 'running', locked_at = now(), attempts = attempts + 1, updated_at = now()
    where id in (
      select id from automation_jobs
      where status in ('queued', 'failed') and run_at <= now()
      order by run_at
      for update skip locked
      limit ${limit}
    )
    returning id, type, payload, status, attempts, max_attempts as "maxAttempts", run_at as "runAt",
      locked_at as "lockedAt", last_error as "lastError", dedupe_key as "dedupeKey",
      created_at as "createdAt", updated_at as "updatedAt"`);
  return [...res];
}

export async function succeed(db: DB, id: number) {
  await db.execute(sql`update automation_jobs set status = 'succeeded', locked_at = null, last_error = null, updated_at = now() where id = ${id}`);
}

export async function fail(db: DB, job: ClaimedJob, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  if (job.attempts >= job.maxAttempts) {
    await db.execute(sql`update automation_jobs set status = 'dead', locked_at = null, last_error = ${msg}, updated_at = now() where id = ${job.id}`);
    await db.insert(s.notifications).values({
      level: "critical",
      kind: "job_dead",
      message: `Automatik "${job.type}" endgültig fehlgeschlagen: ${msg}`,
      data: { jobId: job.id, payload: job.payload },
    });
    return "dead" as const;
  }
  const runAt = new Date(Date.now() + nextRetryDelayMs(job.attempts));
  await db.execute(sql`update automation_jobs set status = 'failed', locked_at = null, last_error = ${msg}, run_at = ${runAt.toISOString()}::timestamptz, updated_at = now() where id = ${job.id}`);
  return "retry" as const;
}

/** Hängengebliebene Aufträge (Worker abgestürzt) nach 15 Minuten wieder freigeben. */
export async function releaseStale(db: DB) {
  await db.execute(sql`update automation_jobs set status = 'failed', locked_at = null, last_error = 'Worker-Zeitüberschreitung'
    where status = 'running' and locked_at < now() - interval '15 minutes'`);
}
