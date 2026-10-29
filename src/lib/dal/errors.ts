/** Błędy warstwy danych mapowane na odpowiedzi HTTP i wyniki Server Actions. */
export class DalError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DalError";
  }
}

/** 404 — także gdy brak uprawnień, żeby nie zdradzać istnienia obiektu (kryterium akceptacji 3). */
export class NotFoundError extends DalError {
  constructor(message = "Nie znaleziono") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ForbiddenError extends DalError {
  constructor(message = "Brak uprawnień do tej operacji") {
    super(message, 403, "FORBIDDEN");
  }
}

export class UnauthorizedError extends DalError {
  constructor(message = "Zaloguj się ponownie") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** Operacja wrażliwa wymaga ponownego potwierdzenia tożsamości (rozdział 6.4). */
export class StepUpRequiredError extends DalError {
  constructor(message = "Potwierdź tożsamość, aby kontynuować") {
    super(message, 403, "STEP_UP_REQUIRED");
  }
}

export class ConflictError extends DalError {
  constructor(message: string, code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class ValidationError extends DalError {
  constructor(message: string) {
    super(message, 400, "VALIDATION");
  }
}

export class GoneError extends DalError {
  constructor(message = "Link wygasł lub został już wykorzystany") {
    super(message, 410, "GONE");
  }
}
