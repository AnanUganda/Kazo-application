import { type NextRequest, NextResponse } from "next/server";
import { submitApplication } from "@/lib/applications/submit";

// Public endpoint — no auth. Accepts JSON or form-encoded bodies so the school's
// public website can post straight to it.
export async function POST(req: NextRequest) {
  let data: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      data = (await req.json()) as Record<string, unknown>;
    } else {
      const form = await req.formData();
      data = Object.fromEntries(form) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the submission." },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const result = await submitApplication(data, ip);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
