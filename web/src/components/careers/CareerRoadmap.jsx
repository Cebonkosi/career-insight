export function CareerRoadmap({ steps }) {
  if (!steps?.length) return null

  return (
    <div className="space-y-6">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-brand text-sm font-semibold text-white">
              {step.step ?? i + 1}
            </div>
            {i < steps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-6">
            <p className="font-medium">{step.title}</p>
            {step.duration && <p className="text-xs text-muted-foreground">{step.duration}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
