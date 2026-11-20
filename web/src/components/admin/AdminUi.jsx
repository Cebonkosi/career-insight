import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
  pending_review: { label: 'Pending', tone: 'primary' },
  active: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  closed: { label: 'Closed', tone: 'muted' },
  draft: { label: 'Draft', tone: 'muted' },
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
