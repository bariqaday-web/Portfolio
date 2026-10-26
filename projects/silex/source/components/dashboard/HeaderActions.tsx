'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Me = { store_name: string | null; full_name: string | null; avatar_url: string | null }

export default function HeaderActions() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      const { data: p } = await supabase
        .from('profiles')
        .select('store_name, full_name, avatar_url')
        .eq('id', uid)
        .single()
      if (alive) setMe(p as Me | null)
    })
    return () => {
      alive = false
    }
  }, [])

  const initial = (me?.store_name ?? me?.full_name ?? '؟').charAt(0)

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile" aria-label="حسابي" className="flex items-center rounded-full px-1 py-1 hover:bg-chip">
        {me?.avatar_url ? (
          <img src={me.avatar_url} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold">{initial}</span>
        )}
      </Link>
    </div>
  )
}
