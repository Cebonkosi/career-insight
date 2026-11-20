import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Page title block from the admin designs: large heading + one-line purpose. */
export function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[34px] font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

/** White bordered panel used for every section in the admin designs. */
export function Panel({ className, ...props }) {
  return <section className={cn('rounded-2xl border border-border bg-card p-5 md:p-6', className)} {...props} />
}

export function PanelHeader({ title, linkTo, linkLabel, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {children}
    </div>
  )
}

const PILL_TONES = {
  solid: 'bg-primary text-primary-foreground',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-accent/10 text-accent',
  danger: 'bg-destructive-soft text-destructive',
  muted: 'bg-secondary text-muted-foreground',
  outline: 'border border-border text-foreground',
}

export function Pill({ tone = 'solid', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        PILL_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

const STATUS_PILLS = {
  active: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'primary' },
  closed: { label: 'Archived', tone: 'muted' },
  // Left over from the earlier submission-review model.
  pending_review: { label: 'Pending (legacy)', tone: 'muted' },
  rejected: { label: 'Rejected (legacy)', tone: 'danger' },
}

export function OpportunityStatusPill({ status }) {
  const pill = STATUS_PILLS[status] ?? { label: status, tone: 'muted' }
  return <Pill tone={pill.tone}>{pill.label}</Pill>
}

export function formatShortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
}

export function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export function formatDateTime(iso) {
  return iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

/** Comma grouping ("12,480") as in the designs. */
export const numberFormat = new Intl.NumberFormat('en-US')

/** Search box used at the top of admin lists. */
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="flex h-12 min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4">
      <SearchIcon className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}

/** Pill tabs with optional counts, e.g. "Published 124". */
export function FilterTabs({ tabs, value, onChange, counts }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => {
        const active = value === tab.value
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold',
              active ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-secondary'
            )}
          >
            {tab.label} {counts?.[tab.value] ?? ''}
          </button>
        )
      })}
    </div>
  )
}

/** Previous / page numbers / next, with "Showing x–y of n". */
export function Pagination({ page, pageSize, total, onPage, noun = 'records' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const visible = Array.from({ length: pages }, (_, i) => i).filter(
    (i) => i < 3 || i === pages - 1 || Math.abs(i - page) <= 1
  )
  const first = total ? page * pageSize + 1 : 0
  const last = Math.min(total, (page + 1) * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <p className="text-xs text-muted-foreground">
        Showing {first}–{last} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-md p-1.5 disabled:opacity-40"
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visible.map((i, index) => (
          <span key={i} className="flex items-center">
            {index > 0 && i - visible[index - 1] > 1 && <span className="px-1 text-xs">…</span>}
            <button
              type="button"
              onClick={() => onPage(i)}
              aria-current={i === page ? 'page' : undefined}
              className={cn(
                'h-7 min-w-7 rounded-full px-2 text-xs',
                i === page ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-secondary'
              )}
            >
              {i + 1}
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-md p-1.5 text-primary disabled:opacity-40"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages - 1}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Inline error with retry, for failed admin queries. */
export function QueryError({ error, onRetry, what = 'this data' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="text-sm font-medium">Couldn&apos;t load {what}.</p>
      <p className="max-w-md text-xs text-muted-foreground">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-primary hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function downloadCsv(filename, header, rows) {
  const cell = (value) => {
    const text = value == null ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = [header.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
