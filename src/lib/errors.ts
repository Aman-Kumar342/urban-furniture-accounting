// Domain errors carrying an HTTP status + stable code. `errorToResponse` (src/lib/http.ts)
// maps any { code, status, message } to a consistent API error envelope.
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const NotFound = (message = "Not found") => new AppError("NOT_FOUND", 404, message);
export const Conflict = (message: string) => new AppError("CONFLICT", 409, message);
export const Unprocessable = (code: string, message: string) => new AppError(code, 422, message);
export const Forbidden = (message = "Forbidden") => new AppError("FORBIDDEN", 403, message);
