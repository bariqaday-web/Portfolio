'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { PAGE_SIZE, listOrders } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Order } from '@/lib/admin/types'

type Row = WithCity<Order>

export default function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    listOrders({ page })
      .then((res) => {
        setRows(res.rows)
        setTotal(res.total)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">الطلبات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <DataTable<Row>
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        columns={[
          { key: 'customer', header: 'العميل', render: (r) => r.customer_name ?? '—' },
          { key: 'phone', header: 'الهاتف', render: (r) => r.customer_phone ?? '—' },
          { key: 'city', header: 'مدينة العميل', render: (r) => r.city ?? '—' },
          { key: 'items', header: 'المنتجات', render: (r) => r.items_count ?? 0 },
          {
            key: 'total',
            header: 'المبلغ',
            render: (r) => (r.total_amount ?? 0).toLocaleString('ar'),
          },
          {
            key: 'status',
            header: 'الحالة',
            render: (r) => <StatusChip>{r.status ?? '—'}</StatusChip>,
          },
          {
            key: 'created',
            header: 'التاريخ',
            render: (r) => new Date(r.created_at).toLocaleDateString('ar'),
          },
        ]}
      />
    </div>
  )
}
