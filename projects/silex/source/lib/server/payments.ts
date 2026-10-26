import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("config");
  return createClient(url, key, { auth: { persistSession: false } });
}

// تُستدعى فقط من Webhook بعد التحقق من توقيعه
export async function markCampaignPaid(opts: {
  campaignId: string;
  provider: string;
  providerRef: string;
  amountUsd: number;
}): Promise<{ ok: true; changed: boolean } | { ok: false; error: "ref_used" | "db" }> {
  const admin = adminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("campaigns")
    .update({
      status: "pending_review",
      pay_provider: opts.provider,
      pay_provider_ref: opts.providerRef,
      pay_amount_usd: opts.amountUsd,
      paid_at: now,
      payment_ref: opts.providerRef.slice(0, 40).toUpperCase(),
      review_note: null,
      updated_at: now,
    })
    .eq("id", opts.campaignId)
    .eq("status", "pending_payment")
    .select("id");
  if (error) return { ok: false, error: error.code === "23505" ? "ref_used" : "db" };
  return { ok: true, changed: (data?.length ?? 0) > 0 };
}
