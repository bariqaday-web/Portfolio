import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'automatic_payments_removed',
      message: 'إعدادات الدفع الإلكتروني الآلي أزيلت. التحويل اليدوي للإعلانات يدار من صفحة أسعار الإعلانات.',
    },
    { status: 410 },
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'automatic_payments_removed' },
    { status: 410 },
  )
}
