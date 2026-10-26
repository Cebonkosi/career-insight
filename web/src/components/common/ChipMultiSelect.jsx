import { cn } from '@/lib/utils'

export function ChipMultiSelect({ options, value, onChange }) {
  function toggle(optionValue) {
    onChange(
      value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        const active = value.includes(optionValue)
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => toggle(optionValue)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
