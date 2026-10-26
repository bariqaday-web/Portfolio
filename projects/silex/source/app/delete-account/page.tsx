import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "حذف الحساب" };

const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "barqaday@gmail.com";

export default function DeleteAccountPage() {
  return (
    <LegalPage title="طلب حذف الحساب" updated="5 أكتوبر 2026">
      <LegalSection title="طريقة تقديم الطلب">
        <p>
          يمكنك طلب حذف حساب ساليكس من داخل التطبيق بعد تسجيل الدخول: افتح الملف
          الشخصي، ثم الإعدادات، ثم اختر «حذف الحساب» وأكد الطلب. سيؤدي الحذف إلى
          إزالة الحساب والمحتوى المرتبط به وفق ما تسمح به السجلات والالتزامات
          النظامية.
        </p>
        <Link
          href="/login?next=%2Fprofile%2Fapp-settings"
          className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
        >
          تسجيل الدخول للمتابعة إلى إعدادات الحساب
        </Link>
      </LegalSection>

      <LegalSection title="إذا تعذر عليك تسجيل الدخول">
        <p>
          أرسل طلب حذف الحساب إلى بريد الدعم. اذكر البريد الإلكتروني المرتبط
          بالحساب، وقد نطلب معلومات إضافية للتحقق من ملكيته قبل تنفيذ الطلب.
        </p>
        <a
          href={`mailto:${email}?subject=${encodeURIComponent("طلب حذف حساب ساليكس")}`}
          className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          إرسال طلب حذف إلى {email}
        </a>
        <p>
          اقرأ أيضاً <Link href="/privacy" className="font-semibold underline">سياسة الخصوصية</Link>.
        </p>
      </LegalSection>

      <LegalSection title="البيانات التي قد يلزم الاحتفاظ بها">
        <p>
          قد نحتفظ بسجلات محدودة للطلبات أو المدفوعات عندما يكون ذلك ضرورياً لمعالجة
          المعاملات أو للوفاء بالالتزامات القانونية، ونحذف أو نخفي هوية البيانات
          الأخرى عند إتمام الطلب. راجع سياسة الخصوصية للتفاصيل.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
