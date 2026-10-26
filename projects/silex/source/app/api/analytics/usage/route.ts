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
    console.error("Usage analytics is missing its Supabase server configuration");
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }

  const supabaseAdmin = createClient(url, serviceKey);
  const token = authorization.slice("Bearer ".length);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let timezoneOffsetMinutes = 0;
  let recordUsageHour = true;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      if ("timezoneOffsetMinutes" in body) {
        const value = body.timezoneOffsetMinutes;
        if (typeof value !== "number" || !Number.isInteger(value) || Math.abs(value) > 840) {
          return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
        }
        timezoneOffsetMinutes = value;
      }
      if ("recordUsageHour" in body) {
        if (typeof body.recordUsageHour !== "boolean") {
          return NextResponse.json({ error: "invalid_request" }, { status: 400 });
        }
        recordUsageHour = body.recordUsageHour;
      }
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("city, country, role, banned_at")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load profile location for usage analytics", profileError);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }
  if (!profile || profile.role === "admin" || profile.banned_at) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (recordUsageHour) {
    const localTime = new Date(Date.now() - timezoneOffsetMinutes * 60_000);
    const activeDate = localTime.toISOString().slice(0, 10);
    const activeHour = localTime.getUTCHours();
    const { error: saveError } = await supabaseAdmin
      .from("app_usage_hours")
      .upsert({
        user_id: authData.user.id,
        active_date: activeDate,
        active_hour: activeHour,
        city: profile.city?.trim() || null,
        country: profile.country?.trim() || null,
      }, {
        onConflict: "user_id,active_date,active_hour",
        ignoreDuplicates: true,
      });
    if (saveError) {
      console.error("Could not record app usage hour", saveError);
      return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
    }
  }

  const { error: activityError } = await supabaseAdmin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", authData.user.id);
  if (activityError) {
    console.error("Could not update the profile last active timestamp", activityError);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }

  if (recordUsageHour) {
    const retentionDate = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const { error: cleanupError } = await supabaseAdmin
      .from("app_usage_hours")
      .delete()
      .lt("active_date", retentionDate);
    if (cleanupError) {
      console.error("Could not remove expired usage analytics", cleanupError);
    }
  }

  return NextResponse.json({ ok: true });
}
