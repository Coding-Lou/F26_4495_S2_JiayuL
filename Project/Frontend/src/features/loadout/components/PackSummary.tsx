import { packContent } from "@/features/packing/content"
import { readinessLine, wholePercent } from "@/features/packing/presentation"
import type { PackItemStatus } from "@/features/packing/types/pack"
import { studioContent } from "../content"
import type { StudioModel } from "../model/studioModel"

type PackSummaryProps = {
  model: StudioModel
  /** The pack response's `readinessPercentage`, as returned. */
  readinessPercentage: number
  /** The pack response's `requiredGear`, for the line under the percentage. */
  requiredGear: readonly PackItemStatus[]
}

/**
 * The two measures (FEATURE-005 sections 14, 16.7), deliberately unlike each
 * other: Gear Readiness is the backend's percentage of recommended
 * categories owned, unchanged; "Equipped for this trip" is a plain count of
 * recommended categories equipped. No meter, no threshold, nothing special
 * at either end.
 */
export function PackSummary({
  model,
  readinessPercentage,
  requiredGear,
}: PackSummaryProps) {
  const { summary } = studioContent
  const recommended = model.recommendedCount > 0

  let caption: string
  if (!recommended) {
    caption = summary.allEquippedCaption
  } else if (model.equippedOther > 0) {
    caption = `${summary.equippedCaption} ${summary.others(model.equippedOther)}`
  } else {
    caption = summary.equippedCaption
  }

  return (
    <div className="studio-summary">
      <h2 className="sr-only">{studioContent.summaryHeading}</h2>
      <dl className="studio-measures">
        {/* With nothing recommended the backend still answers 100; the
            entry is absent, as on Trip Preparation. */}
        {recommended ? (
          <div className="studio-measure">
            <dt>{packContent.readiness.heading}</dt>
            <dd className="studio-measure-value">
              {wholePercent(readinessPercentage)}%
            </dd>
            <dd className="studio-measure-caption">
              {readinessLine(readinessPercentage, requiredGear)}
            </dd>
          </div>
        ) : null}

        <div className="studio-measure">
          <dt>{summary.equippedLabel}</dt>
          <dd className="studio-measure-value">
            {recommended
              ? summary.equippedValue(
                  model.equippedRecommended,
                  model.recommendedCount,
                )
              : summary.allEquippedValue(model.equippedOther)}
          </dd>
          <dd className="studio-measure-caption">{caption}</dd>
        </div>
      </dl>
    </div>
  )
}
