import { useId } from "react"
import { myGearContent } from "../content"
import type { GearFamilyChoice, GearFamilyId } from "../families"

type GearFamilySelectorProps = {
  /** Non-empty families, in order. Rendered only when there are two or more. */
  families: readonly GearFamilyId[]
  chosen: GearFamilyChoice
  onChoose: (family: GearFamilyChoice) => void
}

/**
 * The family selector (FEATURE-007 sections 11.4, 21.7): one native radio
 * group over the grid, one tab stop, arrows move and choose. No counts.
 */
export function GearFamilySelector({
  families,
  chosen,
  onChoose,
}: GearFamilySelectorProps) {
  const name = useId()
  const options: GearFamilyChoice[] = ["all", ...families]

  return (
    <fieldset className="gear-families">
      <legend className="sr-only">{myGearContent.familyLegend}</legend>
      {options.map((option) => (
        <label key={option} className="gear-pill">
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={option}
            checked={chosen === option}
            onChange={() => onChoose(option)}
          />
          <span>{myGearContent.families[option]}</span>
        </label>
      ))}
    </fieldset>
  )
}
