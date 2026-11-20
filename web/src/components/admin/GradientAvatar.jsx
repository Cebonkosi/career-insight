import { cn } from '@/lib/utils'

export function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** Initials on the brand gradient (or the image when there is one), as in the admin designs. */
export function GradientAvatar({ name, src, className }) {
  if (src) {
    return <img src={src} alt={name} className={cn('h-9 w-9 shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
