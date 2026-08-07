import { useEffect, useRef } from 'react'

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT

interface WheelColumnProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

// A single scrollable column (hour, minute, or AM/PM). Uses CSS scroll-snap
// so it settles on one option like a native picker wheel, with padding
// above/below equal to 2 item-heights so the first and last options can
// still center themselves in the middle "selection window".
function WheelColumn({ options, value, onChange }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProgrammaticScroll = useRef(false)

  useEffect(() => {
    const index = options.indexOf(value)
    if (index === -1 || !containerRef.current) return
    isProgrammaticScroll.current = true
    containerRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'auto' })
    const t = setTimeout(() => { isProgrammaticScroll.current = false }, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleScroll = () => {
    if (isProgrammaticScroll.current || !containerRef.current) return
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const index = Math.round(el.scrollTop / ITEM_HEIGHT)
      const clamped = Math.max(0, Math.min(options.length - 1, index))
      const newValue = options[clamped]
      if (newValue !== value) onChange(newValue)
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' })
    }, 120)
  }

  const handleClick = (index: number) => {
    onChange(options[index])
    containerRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
  }

  return (
    <div className="wheel-column-wrapper" style={{ height: PICKER_HEIGHT }}>
      <div
        ref={containerRef}
        className="wheel-column"
        style={{ height: PICKER_HEIGHT, paddingTop: ITEM_HEIGHT * 2, paddingBottom: ITEM_HEIGHT * 2 }}
        onScroll={handleScroll}
      >
        {options.map((opt, i) => (
          <div
            key={opt}
            className={`wheel-item ${opt === value ? 'wheel-item-selected' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => handleClick(i)}
          >
            {opt}
          </div>
        ))}
      </div>
      <div className="wheel-selection-window" />
    </div>
  )
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

export interface WheelTime {
  hour: string
  minute: string
  period: 'AM' | 'PM'
}

interface Props {
  label: string
  value: WheelTime
  onChange: (value: WheelTime) => void
}

// Combines the three wheel columns into one labeled time picker, styled
// to sit side-by-side like Google Maps' "Leave at" time selector.
export default function TimeWheelPicker({ label, value, onChange }: Props) {
  return (
    <div className="time-wheel-picker">
      <label>{label}</label>
      <div className="time-wheel-columns">
        <WheelColumn options={HOURS} value={value.hour} onChange={hour => onChange({ ...value, hour })} />
        <span className="time-wheel-colon">:</span>
        <WheelColumn options={MINUTES} value={value.minute} onChange={minute => onChange({ ...value, minute })} />
        <WheelColumn
          options={PERIODS}
          value={value.period}
          onChange={period => onChange({ ...value, period: period as 'AM' | 'PM' })}
        />
      </div>
    </div>
  )
}

// ── Helpers shared with AddSessionForm ────────────────────────────────

export function wheelTimeTo24h(t: WheelTime): { hour24: number; minute: number } {
  let hour24 = parseInt(t.hour, 10) % 12
  if (t.period === 'PM') hour24 += 12
  return { hour24, minute: parseInt(t.minute, 10) }
}

export function formatWheelTime(t: WheelTime): string {
  return `${t.hour}:${t.minute} ${t.period}`
}

// Returns duration in minutes between two WheelTimes, or null if end
// isn't after start (same-day sessions only — no overnight handling).
export function wheelTimeDurationMinutes(start: WheelTime, end: WheelTime): number | null {
  const s = wheelTimeTo24h(start)
  const e = wheelTimeTo24h(end)
  const startMinutes = s.hour24 * 60 + s.minute
  const endMinutes = e.hour24 * 60 + e.minute
  const diff = endMinutes - startMinutes
  return diff > 0 ? diff : null
}

export function formatDurationMinutes(mins: number | null): string {
  if (mins === null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}hr`
  return `${h}hr ${m}min`
}
