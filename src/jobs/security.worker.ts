import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { revokeAdminSessionsOrThrow } from "@/lib/auth";
import { revokeCustomerSessionsOrThrow } from "@/lib/customer-session";
import type { SecurityJob } from "./types";

/*
 * Retries session revocations that failed on the request path.
 *
 * The producer (revokeOtherAdminSessions / revokeCustomerSessions) cannot
 * throw — the credential change it accompanies is already committed — so a
 * Redis failure at that moment would otherwise leave an attacker's session
 * alive with only a log line to show for it. This worker is what turns that
 * into a transient problem instead of a permanent one.
 *
 * Errors are deliberately RE-THROWN: BullMQ counts the attempt as failed and
 * applies the exponential backoff configured in enqueueSecurityJob. Swallowing
 * here would mark an unrevoked session as successfully revoked.
 */
export function createSecurityWorker(connection: { url: string }) {
  return new Worker<SecurityJob>(
    QUEUE_NAMES.security,
    async (job: Job<SecurityJob>) => {
      if (job.data.type !== "revoke-sessions") return;
      const { subject, subjectId, keepId, reason } = job.data;

      const revoked =
        subject === "admin"
          ? await revokeAdminSessionsOrThrow(Number(subjectId), keepId)
          : await revokeCustomerSessionsOrThrow(subjectId, keepId);

      // Revocation is idempotent: a retry after a partial success finds fewer
      // (or zero) sessions left and still completes. Zero is a success, not a
      // no-op to warn about — it means nothing is left to revoke.
      console.log(
        `[security] revoked ${revoked} ${subject} session(s) for ${subjectId} on retry (${reason})`,
      );
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
}
