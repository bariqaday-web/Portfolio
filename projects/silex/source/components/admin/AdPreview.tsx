'use client'

import { useCallback, useEffect, useState } from 'react'
import { SponsoredCard, type AdItem } from '@/components/SponsoredCard'
import { supabase } from '@/lib/supabase'

type Campaign = {
  type: string
  title: string
  description: string | null
  image_url: string | null
  merchant_id: string
  target_id: string | null
  design_color: string | null
  design_shape: string | null
}
type Merchant = {
  store_name: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  verified_at: string | null
}
type Product = { id: string; title: string; cover_url: string | null; price: number | null }

export function AdPreview({ id, defaultOpen = false }: { id: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(false)
  const [ad, setAd] = useState<AdItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: c, error: e1 } = await supabase
        .from('campaigns')
        .select('type, title, description, image_url, merchant_id, target_id, design_color, design_shape')
        .eq('id', id)
        .maybeSingle()
      if (e1) throw new Error(e1.message)
      const camp = c as Campaign | null
      if (!camp) throw new Error('الإعلان غير موجود')

      const { data: m } = await supabase
        .from('profiles')
        .select('store_name, full_name, username, avatar_url, verified_at')
        .eq('id', camp.merchant_id)
        .maybeSingle()
      const merchant = m as Merchant | null

      let product: Product | null = null
      if (camp.type === 'product' && camp.target_id) {
        const { data: p } = await supabase
          .from('products')
          .select('id, title, cover_url, price')
          .eq('id', camp.target_id)
          .maybeSingle()
        product = p as Product | null
      }

      setAd({
        id,
        type: camp.type as AdItem['type'],
        title: camp.title,
        description: camp.description,
        image_url: camp.image_url,
        merchant_id: camp.merchant_id,
        merchant_name: merchant?.store_name || merchant?.full_name || merchant?.username || 'متجر',
        merchant_avatar: merchant?.avatar_url ?? null,
        merchant_verified: !!merchant?.verified_at,
        product_id: product?.id ?? null,
        product_title: product?.title ?? null,
        product_image: product?.cover_url ?? null,
        product_price: product?.price ?? null,
        design_color: camp.design_color,
        design_shape: camp.design_shape,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل المعاينة')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!defaultOpen) return
    setOpen(true)
    void load()
  }, [defaultOpen, load])

  function toggle() {
    if (open) return setOpen(false)
    setOpen(true)
    if (!ad) void load()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        className="self-start rounded-full border border-border px-4 py-1.5 text-xs font-semibold"
      >
        {open ? 'إخفاء المعاينة' : 'معاينة الإعلان'}
      </button>
      {open &&
        (loading ? (
          <p className="text-xs text-muted">جارٍ تحميل المعاينة...</p>
        ) : error ? (
          <p className="rounded-lg bg-red-100 p-3 text-xs text-red-800">{error}</p>
        ) : ad ? (
          <div className="w-full max-w-md">
            <SponsoredCard ad={ad} preview />
          </div>
        ) : null)}
    </div>
  )
}
