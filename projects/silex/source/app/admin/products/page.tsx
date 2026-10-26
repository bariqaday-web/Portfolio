'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { BrandedActionDialog } from '@/components/ui/BrandedActionDialog'
import { PAGE_SIZE, listProducts } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'
import type { WithCity } from '@/lib/admin/api'
import type { Product } from '@/lib/admin/types'

type Row = WithCity<Product>

export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const res = await listProducts({ page, search })
      setRows(res.rows)
      setTotal(res.total)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh()
    }, 300)
    return () => clearTimeout(t)
  }, [page, search])

  async function toggleProduct(row: Row) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !row.is_active })
        .eq('id', row.id)
      if (error) throw new Error(error.message)
      toast.success(row.is_active ? 'تم إيقاف المنتج' : 'تم تفعيل المنتج')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر تحديث المنتج')
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return
    const row = deleteTarget
    setDeleteTarget(null)
    try {
      const { error } = await supabase.from('products').delete().eq('id', row.id)
      if (error) throw new Error(error.message)
      toast.success('تم حذف المنتج')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر حذف المنتج')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">المنتجات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => {
          setPage(0)
          setSearch(v)
        }}
        searchPlaceholder="بحث باسم المنتج..."
        rowActions={(row) => (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void toggleProduct(row)} className="rounded-full border border-border px-2 py-1 text-[11px]">
              {row.is_active ? 'إيقاف' : 'تفعيل'}
            </button>
            <button type="button" onClick={() => setDeleteTarget(row)} className="rounded-full bg-red-600 px-2 py-1 text-[11px] text-white">
              حذف
            </button>
          </div>
        )}
        columns={[
          { key: 'title', header: 'المنتج', render: (r) => r.title },
          { key: 'category', header: 'التصنيف', render: (r) => r.category ?? '—' },
          { key: 'city', header: 'مدينة التاجر', render: (r) => r.city ?? '—' },
          { key: 'price', header: 'السعر', render: (r) => r.price ?? '—' },
          { key: 'stock', header: 'المخزون', render: (r) => r.stock ?? '—' },
          {
            key: 'active',
            header: 'الحالة',
            render: (r) => (
              <StatusChip status={r.is_active ? 'success' : 'danger'}>
                {r.is_active ? 'نشط' : 'غير نشط'}
              </StatusChip>
            ),
          },
          { key: 'views', header: 'المشاهدات', render: (r) => r.views ?? 0 },
          {
            key: 'created',
            header: 'الإضافة',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
      />
      <BrandedActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف المنتج نهائياً؟"
        description={deleteTarget ? `هل تريد حذف المنتج «${deleteTarget.title}»؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="حذف المنتج"
        destructive
        onConfirm={() => void deleteProduct()}
      />
    </div>
  )
}
