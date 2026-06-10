/**
 * Domain error types for the business logic layer. Keeping these separate from
 * Prisma/HTTP concerns lets the UI and API layers map them to friendly messages.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a write would push stock below zero. */
export class InsufficientStockError extends DomainError {
  constructor(current: number, delta: number) {
    super(
      `Insufficient stock: cannot apply change of ${delta} to current stock of ${current} (would result in ${
        current + delta
      }).`,
    );
  }
}

/** Thrown when a requested entity does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found.`);
  }
}

/** Thrown when input fails validation in the business layer. */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when an operation violates a business rule (e.g. deleting a non-empty category). */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
