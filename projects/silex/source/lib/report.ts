import { supabase } from "@/lib/supabase";

export type ReportTarget = "post" | "comment" | "story" | "product" | "user";

export async function submitReport(
  type: ReportTarget,
  targetId: string,
  reason: string,
  details?: string,
): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) return false;

  try {
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetType: type, targetId, reason, details }),
    });
    return response.ok || response.status === 409;
  } catch (error) {
    console.error("Could not submit report", error);
    return false;
  }
}
