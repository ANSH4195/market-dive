interface Props<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="brut inline-flex overflow-hidden bg-white">
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer px-3.5 py-2 text-sm font-semibold transition-colors ${
              i > 0 ? 'border-l-[2.5px] border-ink' : ''
            } ${on ? 'bg-lavender text-ink' : 'text-ink-soft hover:bg-lilac hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
