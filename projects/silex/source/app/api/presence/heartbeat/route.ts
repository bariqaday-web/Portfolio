import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Presence heartbeat is missing its Supabase server configuration");
    return NextResponse.json({ error: "presence_unavailable" }, { status: 503 });
  }

  const supabaseAdmin = createClient(url, serviceKey);
  const { data, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7));
  if (authError || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.user.id);
  if (error) {
    console.error("Could not update last active timestamp", error);
    return NextResponse.json({ error: "presence_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
