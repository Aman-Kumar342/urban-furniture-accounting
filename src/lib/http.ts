import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

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

// Reads + JSON-parses a request body, throwing a 400 AppError on invalid JSON.
export async function parseJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("BAD_JSON", 400, "Request body must be valid JSON.");
  }
}

// Maps a thrown error to a response: ZodError -> 400 validation; domain/auth error
// ({ code, status, message }) -> its status; anything else -> 500.
export function errorToResponse(e: unknown) {
  if (e instanceof ZodError) {
    return fail("VALIDATION", "Invalid input.", 400, e.flatten().fieldErrors);
  }
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
