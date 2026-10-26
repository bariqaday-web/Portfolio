import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TARGETS = {
  post: { table: "posts", ownerColumn: "user_id" },
  comment: { table: "post_comments", ownerColumn: "user_id" },
  story: { table: "stories", ownerColumn: "merchant_id" },
  product: { table: "products", ownerColumn: "merchant_id" },
  user: { table: "profiles", ownerColumn: "id" },
} as const;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Report submission is missing its Supabase configuration");
    return NextResponse.json({ error: "reports_unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { targetType, targetId, reason, details } = body as Record<string, unknown>;
  if (
    typeof targetType !== "string" ||
    !Object.hasOwn(TARGETS, targetType) ||
    typeof targetId !== "string" ||
    targetId.length > 100 ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.length > 300 ||
    (details !== undefined && (typeof details !== "string" || details.length > 1000))
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const token = authorization.slice("Bearer ".length);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const target = TARGETS[targetType as keyof typeof TARGETS];
  const { data: row, error: targetError } = await supabase
    .from(target.table)
    .select(target.ownerColumn)
    .eq("id", targetId)
    .maybeSingle();
  if (targetError) {
    console.error("Could not validate report target", targetError);
    return NextResponse.json({ error: "reports_unavailable" }, { status: 503 });
  }
  if (!row) return NextResponse.json({ error: "target_not_found" }, { status: 404 });

  const reportedId = (row as Record<string, string>)[target.ownerColumn];
  if (reportedId === authData.user.id) {
    return NextResponse.json({ error: "cannot_report_self" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("reports").insert({
    reporter_id: authData.user.id,
    reported_id: reportedId,
    reason: reason.trim(),
    target_type: targetType,
    target_id: targetId,
    ...(targetType === "post" ? { post_id: targetId } : {}),
    ...(typeof details === "string" ? { details: details.trim() } : {}),
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "duplicate_report" }, { status: 409 });
    }
    console.error("Could not save report", insertError);
    return NextResponse.json({ error: "reports_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
