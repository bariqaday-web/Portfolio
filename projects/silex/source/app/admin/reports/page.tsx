"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import { getReports, setReportStatus, type AdminReport, type ReportStatus, type ReportTypeFilter } from "@/lib/admin/reports";
import { supabase } from "@/lib/supabase";

const TABS: { key: ReportStatus; label: string }[] = [
  { key: "open", label: "مفتوحة" },
  { key: "resolved", label: "تم حلها" },
  { key: "dismissed", label: "متجاهلة" },
];

const REPORT_TYPES: { key: ReportTypeFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "conversation", label: "محادثة" },
  { key: "post", label: "منشور" },
  { key: "comment", label: "تعليق" },
];

const TARGETS: Record<string, string> = {
  post: "منشور",
  comment: "تعليق",
  conversation: "محادثة",
  story: "ستوري",
  product: "منتج",
  user: "مستخدم",
};

function targetLink(r: AdminReport): string | null {
  if (r.target_type === "post" && r.target_id) return `/post/${r.target_id}`;
  if (r.target_type === "product" && r.target_id) return `/product/${r.target_id}`;
  if (r.reported) return `/u/${r.reported.id}`;
  return null;
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<ReportStatus>("open");
  const [reportType, setReportType] = useState<ReportTypeFilter>("all");
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (status: ReportStatus, type: ReportTypeFilter) => {
    setLoading(true);
    setError(false);
    try {
      setRows(await getReports(status, type));
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(tab, reportType);
  }, [tab, reportType, load]);

  async function act(id: string, status: ReportStatus) {
    try {
      await setReportStatus(id, status);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("تم تحديث حالة البلاغ");
    } catch {
      toast.error("تعذّر تحديث البلاغ");
    }
  }

  async function temporaryRestrict(report: AdminReport, days = 7) {
    if (!report.reported?.id) return;
    try {
      const { error } = await supabase.rpc("admin_set_ban", {
        p_user: report.reported.id,
        p_banned: true,
        p_reason: `تقييد مؤقت من إدارة البلاغات (${days} أيام)`,
        p_days: days,
      });
      if (error) throw error;
      toast.success("تم تقييد صاحب المنشور مؤقتاً");
      setRows((prev) => prev.filter((r) => r.id !== report.id));
    } catch {
      toast.error("تعذّر تقييد الحساب");
    }
  }

  async function deleteTarget(report: AdminReport) {
    if (!report.target_id || !report.target_type) return;
    try {
      if (report.target_type === "post") {
        const { error } = await supabase.from("posts").delete().eq("id", report.target_id);
        if (error) throw error;
      } else if (report.target_type === "product") {
        const { error } = await supabase.from("products").delete().eq("id", report.target_id);
        if (error) throw error;
      } else if (report.target_type === "story") {
        const { error } = await supabase.from("stories").delete().eq("id", report.target_id);
        if (error) throw error;
      } else {
        throw new Error("نوع العنصر غير مدعوم");
      }
      toast.success("تم حذف العنصر المبلغ عنه");
      setRows((prev) => prev.filter((r) => r.id !== report.id));
    } catch {
      toast.error("تعذّر حذف العنصر المبلغ عنه");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الشكاوى والبلاغات" subtitle="راجع البلاغات القادمة من المستخدمين واتخذ الإجراء المناسب." />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-pill px-4 py-2 text-sm ${tab === t.key ? "bg-ink text-white" : "bg-chip"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="تصفية البلاغات حسب النوع" className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            aria-pressed={reportType === type.key}
            onClick={() => setReportType(type.key)}
            className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${reportType === type.key ? "border-ink bg-ink text-white" : "border-line bg-card text-ink hover:bg-chip"}`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-chip" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="تعذّر تحميل البلاغات" description="تحقق من الاتصال ومن صلاحيات الأدمن." />
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد بلاغات هنا" description="ستظهر البلاغات الجديدة في هذا القسم." />
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const link = targetLink(r);
            return (
              <article key={r.id} className="rounded-card border border-line bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-pill bg-chip px-3 py-1">{TARGETS[r.target_type ?? ""] ?? "محادثة"}</span>
                  <span className="text-muted">{new Date(r.created_at).toLocaleString("ar-IQ")}</span>
                </div>
                <p className="mt-2 font-semibold">{r.reason ?? "بدون سبب"}</p>
                {r.details && <p className="mt-1 break-words text-sm text-muted">{r.details}</p>}
                <p className="mt-2 text-xs text-muted">
                  المُبلِّغ: {r.reporter?.name ?? "—"} · المُبلَّغ عنه: {r.reported?.name ?? "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {link && (
                    <Link href={link} target="_blank" className="rounded-pill border border-line px-4 py-2 text-xs">
                      عرض
                    </Link>
                  )}
                  {(r.target_type === "post" || r.target_type === "product" || r.target_type === "story") && (
                    <button onClick={() => void deleteTarget(r)} className="rounded-pill bg-red-600 px-4 py-2 text-xs text-white">
                      حذف العنصر
                    </button>
                  )}
                  {r.reported?.id && (
                    <button onClick={() => void temporaryRestrict(r, 7)} className="rounded-pill bg-amber-500 px-4 py-2 text-xs text-white">
                      تقييد 7 أيام
                    </button>
                  )}
                  {tab !== "resolved" && (
                    <button onClick={() => act(r.id, "resolved")} className="rounded-pill bg-ink px-4 py-2 text-xs text-white">
                      تم الحل
                    </button>
                  )}
                  {tab !== "dismissed" && (
                    <button onClick={() => act(r.id, "dismissed")} className="rounded-pill bg-chip px-4 py-2 text-xs">
                      تجاهل
                    </button>
                  )}
                  {tab !== "open" && (
                    <button onClick={() => act(r.id, "open")} className="rounded-pill bg-chip px-4 py-2 text-xs">
                      إعادة فتح
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
