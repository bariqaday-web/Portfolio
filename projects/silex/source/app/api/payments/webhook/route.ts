import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'automatic_payments_removed',
      message: 'لا يوجد Webhook للدفع الإلكتروني الآلي. تتم مراجعة التحويلات اليدوية من الإدارة.',
    },
    { status: 410 },
  )
}
