export function extractLast4Digits(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D+/g, '')
  return digits.slice(-4)
}

export function maskPaymentValue(value: string | null | undefined): string {
  const last4 = extractLast4Digits(value)
  if (!last4) return '••••'
  return `••••${last4}`
}

export function sanitizeTransferName(value: string | null | undefined): string {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  return cleaned
}

export function isLegacyCampaignPaymentError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '')
  if (!message) return false

  if (message.includes('submit_campaign_payment') && /does not exist|could not find the function/i.test(message)) {
    return true
  }

  return (
    /(?:p_payer_name|p_payment_last4|payer_name|payment_last4)/i.test(message) &&
    /does not exist|could not find the column|column .* does not exist/i.test(message)
  )
}
