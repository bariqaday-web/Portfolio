"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { BrandedActionDialog } from "@/components/ui/BrandedActionDialog";
import { logAction } from "@/lib/admin/api";
import { supabase } from "@/lib/supabase";
import { chooseAssistantResponse, getLocalStoreAssistantReplyRule } from "@/lib/local-store-assistant";

type Rule = {
  id: string;
  phrases: string[];
  response: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Draft = {
  id: string | null;
  phrasesText: string;
  response: string;
  priority: string;
};

const EMPTY_DRAFT: Draft = { id: null, phrasesText: "", response: "", priority: "100" };
const input = "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40";

function splitPhrases(value: string) {
  return Array.from(new Set(value.split(/[\n،,]+/u).map((phrase) => phrase.trim()).filter(Boolean)));
}

export default function AssistantRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [testPhrase, setTestPhrase] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("assistant_reply_rules")
      .select("id, phrases, response, priority, is_active, created_at, updated_at")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (queryError) {
      setError("تعذّر تحميل القواعد. تأكد من تطبيق ترحيل قواعد المساعد في قاعدة البيانات.");
    } else {
      setRules((data ?? []) as Rule[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = draft && testPhrase.trim()
    ? getLocalStoreAssistantReplyRule(
        splitPhrases(draft.phrasesText).map((phrase) => ({ phrases: [phrase], response: draft.response })),
        testPhrase,
      )
    : null;

  function editRule(rule: Rule) {
    setError("");
    setSuccess("");
    setDraft({
      id: rule.id,
      phrasesText: rule.phrases.join("\n"),
      response: rule.response,
      priority: String(rule.priority),
    });
  }

  async function saveRule() {
    if (!draft) return;
    const phrases = splitPhrases(draft.phrasesText);
    const priority = Number(draft.priority);
    if (!phrases.length || phrases.length > 12) {
      setError("أدخل من عبارة واحدة إلى ١٢ عبارة.");
      return;
    }
    if (phrases.some((phrase) => phrase.length < 2 || phrase.length > 80)) {
      setError("يجب أن يكون طول كل عبارة من حرفين إلى ٨٠ حرفاً.");
      return;
    }
    if (!draft.response.trim() || draft.response.trim().length > 1000) {
      setError("اكتب رداً واضحاً لا يتجاوز ١٠٠٠ حرف.");
      return;
    }
    if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
      setError("الأولوية يجب أن تكون رقماً صحيحاً بين ٠ و١٠٠٠.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setBusy(false);
      setError("انتهت جلسة المشرف. سجّل الدخول مجدداً.");
      return;
    }
    const values = {
      phrases,
      response: draft.response.trim(),
      priority,
      updated_at: new Date().toISOString(),
    };
    const result = draft.id
      ? await supabase.from("assistant_reply_rules").update(values).eq("id", draft.id).select("id").maybeSingle()
      : await supabase.from("assistant_reply_rules").insert({
          ...values,
          created_by: authData.user.id,
          is_active: false,
        }).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data?.id) {
      setError("تعذّر حفظ القاعدة. لم تتغير قواعد المساعد.");
      return;
    }
    await logAction(draft.id ? "assistant_rule.update" : "assistant_rule.create", "assistant_reply_rules", result.data.id, {
      phrases,
    });
    setSuccess(draft.id ? "تم حفظ تعديل القاعدة." : "أُضيفت القاعدة وهي متوقفة؛ اختبرها ثم فعّلها.");
    setDraft(null);
    await load();
  }

  async function toggleRule(rule: Rule) {
    setBusy(true);
    setError("");
    setSuccess("");
    const { error: updateError } = await supabase
      .from("assistant_reply_rules")
      .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
      .eq("id", rule.id);
    setBusy(false);
    if (updateError) {
      setError("تعذّر تغيير حالة القاعدة.");
      return;
    }
    await logAction(rule.is_active ? "assistant_rule.disable" : "assistant_rule.enable", "assistant_reply_rules", rule.id);
    setSuccess(rule.is_active ? "تم إيقاف القاعدة." : "تم تفعيل القاعدة.");
    await load();
  }

  async function deleteRule(rule: Rule) {
    setDeleteTarget(rule);
  }

  async function confirmDeleteRule() {
    if (!deleteTarget) return;
    const rule = deleteTarget;
    setDeleteTarget(null);
    setBusy(true);
    setError("");
    setSuccess("");
    const { error: deleteError } = await supabase.from("assistant_reply_rules").delete().eq("id", rule.id);
    setBusy(false);
    if (deleteError) {
      setError("تعذّر حذف القاعدة.");
      return;
    }
    await logAction("assistant_rule.delete", "assistant_reply_rules", rule.id, { phrases: rule.phrases });
    setSuccess("تم حذف القاعدة.");
    if (draft?.id === rule.id) setDraft(null);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">توسعة ردود المساعد</h1>
          <p className="mt-1 text-sm text-muted">أضف عبارات وردوداً معتمدة. القواعد الجديدة تبدأ متوقفة ولا تستبدل ردود المتاجر أو معلوماتها.</p>
        </div>
        <button
          type="button"
          onClick={() => { setDraft({ ...EMPTY_DRAFT }); setError(""); setSuccess(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={16} />
          إضافة قاعدة
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

      {draft && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">{draft.id ? "تعديل قاعدة" : "قاعدة رد جديدة"}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="إغلاق" className="rounded-full p-2 hover:bg-chip">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              الكلمات أو العبارات المحفّزة
              <textarea
                rows={5}
                maxLength={1000}
                value={draft.phrasesText}
                onChange={(event) => setDraft((current) => current ? { ...current, phrasesText: event.target.value } : current)}
                placeholder={"عبارة في كل سطر، مثال:\nبيش هذا\nشكد سعره"}
                className={input}
              />
              <span className="text-xs text-muted">حتى ١٢ عبارة، كل عبارة في سطر. تطابق العبارة بعد تطبيع أشكال الحروف العربية.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              الرد المعتمد
              <textarea
                rows={5}
                maxLength={1000}
                value={draft.response}
                onChange={(event) => setDraft((current) => current ? { ...current, response: event.target.value } : current)}
                placeholder="اكتب الرد الذي سيظهر للزبون..."
                className={input}
              />
              <span className="text-xs text-muted">نص فقط، لا يُنفذ كتعليمات أو كود. افصل الردود البديلة بـ |||، وسيختار المساعد رداً مختلفاً عن آخر رد في المحادثة. لا تضع أسعاراً أو سياسات متغيرة في الرد العام.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium md:max-w-xs">
              ترتيب الأولوية
              <input
                type="number"
                min="0"
                max="1000"
                value={draft.priority}
                onChange={(event) => setDraft((current) => current ? { ...current, priority: event.target.value } : current)}
                className={input}
              />
              <span className="text-xs text-muted">الرقم الأقل يُفحص أولاً.</span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={testPhrase}
              onChange={(event) => setTestPhrase(event.target.value)}
              placeholder="اختبر عبارة قبل التفعيل"
              aria-label="اختبار عبارة القاعدة"
              className={`${input} md:max-w-sm`}
            />
            {preview && (
              <span className={`text-sm ${preview.matched ? "text-emerald-800" : "text-muted"}`}>
                {preview.matched ? `الرد المتوقع: ${chooseAssistantResponse(preview.response ?? "")}` : "لا تطابق هذه العبارة القاعدة حالياً."}
              </span>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void saveRule()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Save size={16} />
              {busy ? "جارٍ الحفظ..." : "حفظ القاعدة"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-border px-5 py-2.5 text-sm">إلغاء</button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">القواعد الحالية</h2>
        {loading ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted">جارٍ تحميل القواعد...</p>
        ) : rules.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted">لا توجد قواعد مضافة. ابدأ بقاعدة واحدة واختبرها قبل تفعيلها.</p>
        ) : rules.map((rule) => (
          <article key={rule.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{rule.phrases.join(" · ")}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${rule.is_active ? "bg-emerald-100 text-emerald-800" : "bg-chip text-muted"}`}>
                    {rule.is_active ? "مفعّلة" : "متوقفة"}
                  </span>
                  <span className="text-xs text-muted">الأولوية {rule.priority}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                  {rule.response.split(/\s*\|\|\|\s*/u).join("\nأو: ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void toggleRule(rule)} className="rounded-full border border-border px-3 py-2 text-xs disabled:opacity-50">
                  {rule.is_active ? "إيقاف" : "تفعيل"}
                </button>
                <button type="button" disabled={busy} onClick={() => editRule(rule)} aria-label="تعديل القاعدة" className="rounded-full border border-border p-2 disabled:opacity-50">
                  <Pencil size={15} />
                </button>
                <button type="button" disabled={busy} onClick={() => void deleteRule(rule)} aria-label="حذف القاعدة" className="rounded-full border border-red-200 p-2 text-red-700 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <BrandedActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف القاعدة نهائياً؟"
        description={deleteTarget ? `هل تريد حذف قاعدة «${deleteTarget.phrases[0]}»؟` : ''}
        confirmLabel="حذف القاعدة"
        destructive
        busy={busy}
        onConfirm={() => void confirmDeleteRule()}
      />
    </div>
  );
}
