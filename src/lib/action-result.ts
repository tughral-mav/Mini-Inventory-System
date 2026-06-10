import { ZodError } from "zod";
import {
  ConflictError,
  DomainError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

/**
 * A uniform result shape returned by server actions so the UI can render
 * success/error states without throwing across the client boundary.
 */
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Map any thrown error (Zod, domain, Prisma) to a friendly message. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((i) => i.message).join(", ");
  }
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof DomainError
  ) {
    return error.message;
  }
  // Prisma unique-constraint violation.
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return "A record with that unique value already exists.";
    if (code === "P2003") return "Related record not found (foreign key constraint).";
    if (code === "P2025") return "Record not found.";
  }
  console.error("Unexpected error:", error);
  return "Something went wrong. Please try again.";
}

/** Run a server-side operation and wrap the outcome in an ActionResult. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** HTTP status code appropriate for a thrown error (used by REST routes). */
export function toHttpStatus(error: unknown): number {
  if (error instanceof ZodError || error instanceof ValidationError) return 400;
  if (error instanceof NotFoundError) return 404;
  // Business-rule violations (insufficient stock, non-empty category) are
  // client errors (conflict with current state), not server faults.
  if (error instanceof ConflictError || error instanceof InsufficientStockError) return 409;
  if (error instanceof DomainError) return 400;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002" || code === "P2003") return 409;
    if (code === "P2025") return 404;
  }
  return 500;
}
