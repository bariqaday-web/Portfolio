import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'automatic_payments_removed',
      message: 'الدفع الإلكتروني الآلي غير مستخدم. استخدم التحويل اليدوي من صفحة الإعلان.',
    },
    { status: 410 },
  )
}
