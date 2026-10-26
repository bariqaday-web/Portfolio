"use client";

import { Notice } from "@/components/ui/Notice";
import { toast } from "sonner";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function handleEmailChange(value: string) {
    setEmail(value.trim());
  }

  const displayEmail = email.trim();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErr("يرجى تعبئة جميع الحقول");
      return;
    }
    if (password.length < 6) {
      setErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: displayEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: buildAuthCallbackUrl(window.location.origin, "/home"),
        },
      });

      if (error) {
        setErr(
          error.message === "User already registered"
            ? "هذا البريد مسجّل مسبقاً، جرّب تسجيل الدخول"
            : "حدث خطأ أثناء إنشاء الحساب، حاول مجدداً"
        );
        return;
      }

      if (data.session) {
        router.push("/home");
      } else {
        router.push("/register/check-email");
      }
    } catch (error) {
      setErr("حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell flex flex-col justify-center p-6 dir-rtl">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1">
            إنشاء حساب جديد
          </h1>
          <p className="text-xs text-[#111111]/60">
            انضم إلى ساليكس وابدأ التسوّق الآن
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#111111]/70 mb-1.5">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="اسمك الكامل"
              className="w-full bg-[#faf8f5] border border-[#111111]/15 rounded-2xl px-4 py-3 text-sm text-[#111111] placeholder:text-[#111111]/40 outline-none focus:border-[#111111] transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-medium text-[#111111]/70 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="flex items-center bg-[#faf8f5] border border-[#111111]/15 rounded-2xl px-4 py-3 focus-within:border-[#111111] transition-all">
              <input
                id="register-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 bg-transparent outline-none text-sm text-[#111111] placeholder:text-[#111111]/40"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111]/70 mb-1.5">
              كلمة المرور
            </label>
            <div className="flex items-center bg-[#faf8f5] border border-[#111111]/15 rounded-2xl px-4 py-3 gap-3 focus-within:border-[#111111] transition-all">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-sm text-[#111111] placeholder:text-[#111111]/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#111111]/40 hover:text-[#111111] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p className="text-xs leading-5 text-[#111111]/60">
            بإنشاء الحساب، توافق على{" "}
            <Link href="/terms" className="font-semibold underline">
              شروط الاستخدام
            </Link>{" "}
            وتقر باطلاعك على{" "}
            <Link href="/privacy" className="font-semibold underline">
              سياسة الخصوصية
            </Link>
            .
          </p>

          {err && (
            <Notice type="error">{err}</Notice>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#111111]/60">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-[#111111] font-bold underline underline-offset-4 hover:opacity-80 transition">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
