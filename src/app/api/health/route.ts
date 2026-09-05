import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Infrastructure health check: confirms the app is up and the DB is reachable.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", db: "down", message: (error as Error).message },
      { status: 503 },
    );
  }
}
