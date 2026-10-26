import { cn } from '@/lib/utils'

export function CategoryFilterChips({ categories, active, onChange }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'shrink-0 rounded-full border px-3 py-1.5 text-sm',
          !active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-sm',
            active === c.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
