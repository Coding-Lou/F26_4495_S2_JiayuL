import { useId } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatTripDateLong } from "@/features/planning/tripDate"
import {
  CALENDAR_WEEKS,
  WEEKDAYS,
  dayOfIso,
  monthLabel,
  monthWeeks,
  type CalendarMonth,
} from "../model/calendarMonth"
import { myPlansContent } from "../myPlansContent"
import type { Plan } from "../types/plan"

type PlanCalendarProps = {
  month: CalendarMonth
  today: string
  byDate: ReadonlyMap<string, readonly Plan[]>
  /** The selected Plan's date, or the day the list is narrowed to. */
  selectedDate: string | null
  onPrevious: () => void
  onNext: () => void
  onDay: (date: string) => void
}

/**
 * The monthly calendar (FEATURE-013 D11–D14, section 10.6): a semantic
 * table labelled by the month, Sunday first, always six weeks. Only days
 * with Plans are buttons; every other day is plain text and does nothing.
 * It is derived from the loaded list and makes no request of its own.
 */
export function PlanCalendar({
  month,
  today,
  byDate,
  selectedDate,
  onPrevious,
  onNext,
  onDay,
}: PlanCalendarProps) {
  const { calendar } = myPlansContent
  const headingId = useId()
  const labelId = useId()

  return (
    <section className="plans-calendar" aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        {calendar.heading}
      </h2>

      <div className="plans-calendar-header">
        <div aria-live="polite">
          <h3 id={labelId} className="plans-month">
            {monthLabel(month)}
          </h3>
        </div>
        <div className="plans-month-nav">
          <button
            type="button"
            className="trip-control plans-circle"
            aria-label={calendar.previous}
            onClick={onPrevious}
          >
            <ChevronLeft aria-hidden="true" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="trip-control plans-circle"
            aria-label={calendar.next}
            onClick={onNext}
          >
            <ChevronRight aria-hidden="true" strokeWidth={2} />
          </button>
        </div>
      </div>

      <table className="plans-grid" aria-labelledby={labelId}>
        <WeekdayHeader />
        <tbody>
          {monthWeeks(month).map((week, index) => (
            <tr key={index}>
              {week.map((date, weekday) =>
                date === null ? (
                  <td key={weekday} />
                ) : (
                  <DayCell
                    key={date}
                    date={date}
                    today={today}
                    plans={byDate.get(date) ?? []}
                    selected={date === selectedDate}
                    onDay={onDay}
                  />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <CalendarLegend />
    </section>
  )
}

function CalendarLegend() {
  const { calendar } = myPlansContent
  return (
    <ul className="plans-legend">
      <li>
        <span className="plans-mark" data-kind="upcoming" aria-hidden="true" />
        {calendar.legendUpcoming}
      </li>
      <li>
        <span className="plans-mark" data-kind="past" aria-hidden="true" />
        {calendar.legendPast}
      </li>
    </ul>
  )
}

function WeekdayHeader() {
  return (
    <thead>
      <tr>
        {WEEKDAYS.map((weekday) => (
          <th key={weekday.long} scope="col">
            <span aria-hidden="true">{weekday.short}</span>
            <span className="sr-only">{weekday.long}</span>
          </th>
        ))}
      </tr>
    </thead>
  )
}

type DayCellProps = {
  date: string
  today: string
  plans: readonly Plan[]
  selected: boolean
  onDay: (date: string) => void
}

function DayCell({ date, today, plans, selected, onDay }: DayCellProps) {
  const isToday = date === today
  const day = dayOfIso(date)

  if (plans.length === 0) {
    return (
      <td aria-current={isToday ? "date" : undefined}>
        <span className="plans-day" data-today={isToday ? true : undefined}>
          <span className="plans-day-number">{day}</span>
          {isToday ? (
            <span className="sr-only">{myPlansContent.calendar.plainToday}</span>
          ) : null}
        </span>
      </td>
    )
  }

  const kind = date >= today ? "upcoming" : "past"
  return (
    <td aria-current={isToday ? "date" : undefined}>
      <button
        type="button"
        className="trip-control plans-day"
        data-kind={kind}
        data-today={isToday ? true : undefined}
        aria-pressed={selected}
        aria-label={myPlansContent.calendar.dayName(
          formatTripDateLong(date, today),
          plans.length,
          isToday,
        )}
        onClick={() => onDay(date)}
      >
        <span className="plans-day-number">{day}</span>
        <span className="plans-day-marks" aria-hidden="true">
          <span className="plans-mark" data-kind={kind} />
          {plans.length >= 2 ? (
            <span className="plans-count">{plans.length}</span>
          ) : null}
        </span>
      </button>
    </td>
  )
}

/**
 * The calendar while the list loads (section 10.6): the same panel with
 * placeholders, real weekday headers, six empty weeks, the legend, and no
 * buttons, so the ready calendar replaces it without a shift.
 * Hidden from assistive technology; the page's loading status covers it.
 */
export function PlanCalendarPlaceholder() {
  return (
    <div className="plans-calendar" aria-hidden="true">
      <div className="plans-calendar-header">
        <span className="plans-bar plans-month-bar" />
        <div className="plans-month-nav">
          <span className="plans-circle" data-placeholder />
          <span className="plans-circle" data-placeholder />
        </div>
      </div>
      <table className="plans-grid">
        <WeekdayHeader />
        <tbody>
          {Array.from({ length: CALENDAR_WEEKS }, (_, week) => (
            <tr key={week}>
              {WEEKDAYS.map((weekday) => (
                <td key={weekday.long}>
                  <span className="plans-day" data-placeholder />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <CalendarLegend />
    </div>
  )
}
