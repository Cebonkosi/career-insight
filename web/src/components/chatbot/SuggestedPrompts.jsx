const PROMPTS = [
  "What careers suit someone who loves Maths and Physical Sciences?",
  "What subjects do I need for a career in medicine?",
  "Explain the roadmap to becoming a software engineer in SA",
  "What's the difference between a university and a TVET college?",
]

export function SuggestedPrompts({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
