import { NextResponse } from "next/server";
import { cancelAllActiveRuns } from "@/lib/tinyfish";

export async function POST() {
  const count = await cancelAllActiveRuns();
  return NextResponse.json({ cancelled: count });
}
