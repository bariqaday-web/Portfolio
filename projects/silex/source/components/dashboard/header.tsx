"use client"

import type { ReactNode } from "react"
import { Search } from "lucide-react"
import { useStore } from "@/components/store/store-context"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
  search?: boolean
}

export function Header({ title, description, actions, search = true }: HeaderProps) {
  const { query, setQuery } = useStore()

  return (
    <header className="flex min-w-0 flex-col gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-muted sm:mt-2 sm:text-sm">{description}</p>
        </div>
        {actions && <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">{actions}</div>}
      </div>
      {search && (
        <div className="relative w-full max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج أو زبون"
            className="h-10 w-full rounded-full border border-border bg-card ps-10 pe-4 text-sm sm:h-11"
          />
        </div>
      )}
    </header>
  )
}
