"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  getCategories,
  getSuggestions,
  norm,
  searchProductsPage,
  searchPeople,
  type ProductSearchFilters,
  type PersonResult,
  type Product,
  type Category,
  type Suggestions,
} from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import ScreenHeader from "@/components/ScreenHeader";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const chip = "min-h-10 shrink-0 rounded-xl border border-line/50 bg-card px-3.5 py-2 text-sm transition-colors hover:bg-chip";
const field = "min-h-12 w-full rounded-xl border border-line/50 bg-card px-3 py-2.5 text-sm outline-none focus:border-ink/40";
const SEARCH_PAGE_SIZE = 12;

function isSearchOrder(value: string): value is NonNullable<ProductSearchFilters["order"]> {
  return value === "new" || value === "price-asc" || value === "price-desc";
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [done, setDone] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState<NonNullable<ProductSearchFilters["order"]>>("new");
  const [searchError, setSearchError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sugg, setSugg] = useState<Suggestions>({ categories: [], terms: [] });
  const searchGeneration = useRef(0);

  useEffect(() => {
    getSuggestions().then(setSugg).catch((error) => {
      console.error("Could not load search suggestions", error);
    });
    getCategories().then(setCategories).catch((error) => {
      console.error("Could not load product categories", error);
      setSearchError("تعذّر تحميل تصنيفات المنتجات");
    });
  }, []);

  useEffect(() => {
    const generation = ++searchGeneration.current;
    setDone(false);
    setHasMoreResults(false);
    const term = q.trim();
    const minText = normalizeDigits(minPrice).trim();
    const maxText = normalizeDigits(maxPrice).trim();
    const min = minText ? Number(minText) : undefined;
    const max = maxText ? Number(maxText) : undefined;
    const hasFilters = Boolean(category || minText || maxText || order !== "new");
    if ((minText && (min === undefined || !Number.isFinite(min) || min < 0)) ||
        (maxText && (max === undefined || !Number.isFinite(max) || max < 0))) {
      setSearchError("أدخل سعراً صحيحاً");
      setResults([]);
      setPeople([]);
      setDone(true);
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setSearchError("السعر الأدنى يجب ألا يتجاوز السعر الأعلى");
      setResults([]);
      setPeople([]);
      setDone(true);
      return;
    }
    setSearchError("");
    if (!term && !hasFilters) {
      setResults([]);
      setPeople([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      const filters: ProductSearchFilters = { category: category || undefined, minPrice: min, maxPrice: max, order };
      Promise.all([searchProductsPage(term, filters, 0, SEARCH_PAGE_SIZE), term ? searchPeople(term) : Promise.resolve([])])
        .then(([page, ppl]) => {
          if (!alive) return;
          if (generation !== searchGeneration.current) return;
          setResults(page.items);
          setHasMoreResults(page.hasMore);
          setPeople(ppl);
          setDone(true);
        })
        .catch((error) => {
          if (!alive) return;
          setSearchError(error instanceof Error ? error.message : "تعذّر البحث عن المنتجات");
          setResults([]);
          setPeople([]);
          setDone(true);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, category, minPrice, maxPrice, order]);

  async function loadMoreResults() {
    if (loadingMore || !hasMoreResults) return;
    const generation = searchGeneration.current;
    const minText = normalizeDigits(minPrice).trim();
    const maxText = normalizeDigits(maxPrice).trim();
    setLoadingMore(true);
    try {
      const page = await searchProductsPage(
        q.trim(),
        {
          category: category || undefined,
          minPrice: minText ? Number(minText) : undefined,
          maxPrice: maxText ? Number(maxText) : undefined,
          order,
        },
        results.length,
        SEARCH_PAGE_SIZE
      );
      if (generation !== searchGeneration.current) return;
      setResults((current) => [...current, ...page.items]);
      setHasMoreResults(page.hasMore);
    } catch (error) {
      if (generation === searchGeneration.current) {
        setSearchError(error instanceof Error ? error.message : "تعذّر تحميل المزيد من المنتجات");
      }
    } finally {
      if (generation === searchGeneration.current) setLoadingMore(false);
    }
  }

  const hasFilters = Boolean(category || minPrice.trim() || maxPrice.trim() || order !== "new");
  const hasSearch = Boolean(q.trim() || hasFilters);

  function clearSearch() {
    setQ("");
  }

  function clearFilters() {
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setOrder("new");
    setSearchError("");
  }

  function clearAll() {
    clearSearch();
    clearFilters();
  }

  // لا يتم حفظ أي سجل لعمليات البحث - كل بحث مؤقت وينتهي فور مغادرة الصفحة
  function commit(_term: string) {
    return;
  }

  const nq = norm(q);
  const matches = useMemo(() => {
    if (!nq) return [];
    const pool = [...sugg.categories.map((c) => c.name), ...sugg.terms];
    return pool.filter((t) => norm(t).includes(nq) && norm(t) !== nq).slice(0, 6);
  }, [nq, sugg]);

  const categoryChips = sugg.categories.map((c) => (
    <button
      key={c.id}
      type="button"
      aria-pressed={category === c.id}
      onClick={() => setCategory((current) => current === c.id ? "" : c.id)}
      className={`${chip} inline-flex items-center gap-2 ${category === c.id ? "border-ink bg-chip font-semibold" : ""}`}
    >
      <span>{c.name}</span>
      <span className="text-xs tabular-nums text-muted">{c.count}</span>
    </button>
  ));
  const categoryOptions = [
    { value: "", label: "كل التصنيفات" },
    ...categories.map((item) => ({ value: item.id, label: item.name })),
  ];
  const orderOptions = [
    { value: "new", label: "الأحدث" },
    { value: "price-asc", label: "السعر: من الأقل للأعلى" },
    { value: "price-desc", label: "السعر: من الأعلى للأقل" },
  ];

  return (
    <div>
      <ScreenHeader title="بحث" />

      <div className="px-6 mt-2 md:px-10">
        <div className="flex items-center gap-2 bg-chip rounded-pill px-4 py-3">
          <SearchIcon size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length) commit(q.trim());
            }}
            placeholder="ابحث عن منتج أو تاجر..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted"
          />
          {q && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="مسح عبارة البحث والنتائج"
              title="مسح البحث"
              className="flex shrink-0 items-center gap-1 rounded-full bg-card px-2.5 py-1.5 text-xs text-muted"
            >
              <X size={15} />
              مسح
            </button>
          )}
        </div>
      </div>

      <div className="mx-6 mt-4 sm:hidden">
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-chip px-4 text-sm font-medium"
            >
              <SlidersHorizontal size={16} />
              تصفية المنتجات
              {hasFilters && <span className="size-2 rounded-full bg-ink" aria-label="توجد فلاتر مفعّلة" />}
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="إغلاق الفلاتر"
                className="absolute left-3 top-3 flex size-12 items-center justify-center rounded-full hover:bg-chip"
              >
                <X size={18} />
              </button>
            </DialogClose>
            <DialogHeader className="pe-12">
              <DialogTitle>تصفية المنتجات</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                التصنيف / النوع
                <Dropdown
                  options={categoryOptions}
                  value={category}
                  onChange={setCategory}
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                السعر من
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  dir="ltr"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="أقل سعر"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                السعر إلى
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  dir="ltr"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="أعلى سعر"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-muted">
                الترتيب
                <Dropdown
                  options={orderOptions}
                  value={order}
                  onChange={(value) => {
                    if (isSearchOrder(value)) setOrder(value);
                  }}
                  className={field}
                />
              </label>
            </div>
            {searchError && <p role="alert" className="text-xs text-red-700">{searchError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearAll}
                disabled={!q && !hasFilters}
                className="min-h-12 flex-1 rounded-full bg-chip px-4 text-sm font-medium disabled:opacity-40"
              >
                مسح الكل
              </button>
              <DialogClose asChild>
                <button type="button" className="min-h-12 flex-1 rounded-full bg-ink px-4 text-sm font-semibold text-white">
                  عرض النتائج
                </button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mx-6 mt-4 hidden border-b border-line/40 pb-4 sm:block md:mx-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">تصفية المنتجات</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearAll}
              disabled={!q && !hasFilters}
              className="flex items-center gap-1.5 text-xs font-medium text-muted disabled:opacity-40"
            >
              <RotateCcw size={14} />
              مسح البحث والفلاتر
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            التصنيف / النوع
            <Dropdown
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            السعر من
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              dir="ltr"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="أقل سعر"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            السعر إلى
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              dir="ltr"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="أعلى سعر"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            الترتيب
            <Dropdown
              options={orderOptions}
              value={order}
              onChange={(value) => {
                if (isSearchOrder(value)) setOrder(value);
              }}
              className={field}
            />
          </label>
        </div>
        {searchError && <p role="alert" className="mt-3 text-xs text-red-700">{searchError}</p>}
        {(q || hasFilters) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {q && (
              <button type="button" onClick={clearSearch} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                البحث: {q} <X size={13} />
              </button>
            )}
            {category && (
              <button type="button" onClick={() => setCategory("")} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                {categories.find((item) => item.id === category)?.name ?? "التصنيف"} <X size={13} />
              </button>
            )}
            {minPrice && (
              <button type="button" onClick={() => setMinPrice("")} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                من ${minPrice} <X size={13} />
              </button>
            )}
            {maxPrice && (
              <button type="button" onClick={() => setMaxPrice("")} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                إلى ${maxPrice} <X size={13} />
              </button>
            )}
            {order !== "new" && (
              <button type="button" onClick={() => setOrder("new")} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                {order === "price-asc" ? "الأقل سعراً" : "الأعلى سعراً"} <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {!hasSearch && (
        <div className="mx-6 mt-6 grid gap-6 md:mx-10 lg:grid-cols-2">
          {sugg.categories.length > 0 && (
            <section className="min-w-0">
              <h2 className="mb-3 text-sm font-semibold">تصنيفات متوفرة</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">{categoryChips}</div>
            </section>
          )}

          {sugg.terms.length > 0 && (
            <section className="min-w-0">
              <h2 className="mb-3 text-sm font-semibold">الأكثر مشاهدة</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
                {sugg.terms.map((t) => (
                  <button key={t} type="button" onClick={() => setQ(t)} className={`${chip} max-w-[75vw] truncate sm:max-w-[220px]`}>
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {hasSearch && (
        <div className="px-6 mt-6 md:px-10">
          {matches.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {matches.map((m) => (
                <button key={m} onClick={() => setQ(m)} className={`${chip} max-w-[220px] truncate`}>
                  {m}
                </button>
              ))}
            </div>
          )}

          {people.length > 0 && (
            <div className="mb-6">
              <p className="mb-3 text-xs text-muted">حسابات</p>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {people.map((p) => (
                  <Link
                    key={p.id}
                    href={`/u/${p.id}`}
                    onClick={() => commit(q.trim())}
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
                  >
                    <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-chip font-display text-lg">
                      {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : p.name.charAt(0)}
                    </span>
                    <span className="w-full truncate text-[11px]">{p.name}</span>
                    {p.username && (
                      <span dir="ltr" className="w-full truncate text-[10px] text-muted">
                        @{p.username}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {done && results.length > 0 && (
            <p className="text-xs text-muted mb-3">
              {results.length} منتج{q ? ` لـ «${q}»` : ""}
            </p>
          )}

          {!done && <p className="mb-3 text-xs text-muted">جارٍ البحث...</p>}

          <div
            className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
            onClickCapture={() => commit(q.trim())}
          >
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {hasMoreResults && (
            <button
              type="button"
              onClick={loadMoreResults}
              disabled={loadingMore}
              className="mx-auto mt-6 block rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
            </button>
          )}

          {done && !searchError && results.length === 0 && people.length === 0 && (
            <div className="text-center mt-10">
              <p className="text-sm text-muted">
                {q ? `لا توجد نتائج لـ «${q}»` : "لا توجد منتجات تطابق هذه الفلاتر"}
              </p>
              {sugg.categories.length > 0 && (
                <>
                  <p className="text-xs text-muted mt-6 mb-3">جرّب أحد التصنيفات المتوفرة</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible">{categoryChips}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
