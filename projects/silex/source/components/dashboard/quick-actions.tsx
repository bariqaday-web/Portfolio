"use client"

import { useState } from "react"
import Link from "next/link"
import { ClipboardPlus, Megaphone, PackagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/components/store/store-context"
import { toast } from "sonner"

export function QuickActions() {
  const { addOrder } = useStore()
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState("")
  const [items, setItems] = useState("")
  const [total, setTotal] = useState("")

  function handleCreate() {
    const itemsNum = Number(items)
    const totalNum = Number(total)
    if (!customer.trim() || itemsNum <= 0 || totalNum <= 0) {
      toast.error("يرجى إدخال اسم الزبون وعدد الأصناف والمبلغ")
      return
    }
    addOrder({ customer: customer.trim(), items: itemsNum, total: totalNum, status: "قيد التجهيز" })
    toast.success(`تم إنشاء فاتورة لـ ${customer.trim()}`)
    setCustomer("")
    setItems("")
    setTotal("")
    setOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-10 min-w-0 flex-1 gap-1 px-2 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none sm:px-3 sm:text-sm"
      >
        <ClipboardPlus className="size-4 shrink-0" />
        <span className="truncate">فاتورة</span>
      </Button>
      <Button
        asChild
        variant="outline"
        className="h-10 min-w-0 flex-1 gap-1 px-2 text-[11px] bg-transparent sm:flex-none sm:px-3 sm:text-sm"
      >
        <Link href="/dashboard/inventory" className="flex min-w-0 items-center gap-1">
          <PackagePlus className="size-4 shrink-0" />
          <span className="truncate">منتج</span>
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="h-10 min-w-0 flex-1 gap-1 px-2 text-[11px] bg-transparent sm:flex-none sm:px-3 sm:text-sm"
      >
        <Link href="/dashboard/ads" className="flex min-w-0 items-center gap-1">
          <Megaphone className="size-4 shrink-0" />
          <span className="truncate">إعلان</span>
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>فاتورة جديدة</DialogTitle>
            <DialogDescription>سجّل طلباً جديداً لأحد الزبائن.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="order-customer">اسم الزبون</Label>
              <Input
                id="order-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="مثال: حسن علي"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="order-items">عدد الأصناف</Label>
                <Input
                  id="order-items"
                  type="text" inputMode="decimal"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="3"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-total">المبلغ (د.ع)</Label>
                <Input
                  id="order-total"
                  type="text" inputMode="decimal"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="15000"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent">
              إلغاء
            </Button>
            <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              حفظ الفاتورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
