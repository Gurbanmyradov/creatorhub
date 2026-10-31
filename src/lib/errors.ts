export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export class NotFoundError extends ApiError {
  constructor(what: string) {
    super(404, `${what} not found`);
  }
}
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
  }
}
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
  }
}
