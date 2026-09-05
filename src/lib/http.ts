import { NextResponse } from "next/server";

// Consistent success + error envelopes for all API routes.
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

// Maps a thrown domain/auth error ({ code, status, message }) to a response.
export function errorToResponse(e: unknown) {
  if (
    e &&
    typeof e === "object" &&
    "status" in e &&
    "code" in e &&
    "message" in e
  ) {
    const err = e as { status: number; code: string; message: string };
    return fail(err.code, err.message, err.status);
  }
  console.error("Unhandled API error:", e);
  return fail("INTERNAL", "Something went wrong.", 500);
}
