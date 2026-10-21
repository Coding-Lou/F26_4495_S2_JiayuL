import { useId, type ReactNode } from "react"
import type { PlanSectionName } from "../model/planCollection"
import { myPlansContent } from "../myPlansContent"
import type { Plan } from "../types/plan"
import { PlanEntry, type PlanEntryContext } from "./PlanEntry"

type PlanEntryListProps = {
  plans: readonly Plan[]
  context: PlanEntryContext
}

/** Entries as one `ul`, rule-separated (section 10.3). */
export function PlanEntryList({ plans, context }: PlanEntryListProps) {
  const listIds = plans.map((plan) => plan.id)
  return (
    <ul className="plan-entries">
      {plans.map((plan) => (
        <PlanEntry
          key={plan.id}
          plan={plan}
          listIds={listIds}
          context={context}
        />
      ))}
    </ul>
  )
}

type PlanSectionProps = {
  name: PlanSectionName
  plans: readonly Plan[]
  context: PlanEntryContext
  /** Shown instead of the list when it has no Plans (No upcoming, 10.7). */
  empty?: ReactNode
}

/**
 * Upcoming or Past (FEATURE-013 section 11): an `h2`, a focus target with no
 * ring (D18), then its entries.
 */
export function PlanSection({ name, plans, context, empty }: PlanSectionProps) {
  const headingId = useId()

  return (
    <section className="plans-section" aria-labelledby={headingId}>
      <h2
        id={headingId}
        tabIndex={-1}
        className="trip-focus-target plans-section-heading"
        data-plans-heading={name}
      >
        {name === "upcoming" ? myPlansContent.upcoming : myPlansContent.past}
      </h2>
      {plans.length > 0 ? (
        <PlanEntryList plans={plans} context={context} />
      ) : (
        empty
      )}
    </section>
  )
}
