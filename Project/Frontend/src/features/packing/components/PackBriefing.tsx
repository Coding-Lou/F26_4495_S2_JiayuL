import { useId } from "react"
import { CircleCheck, CircleDashed, Info } from "lucide-react"
import { formatTripDateShort, todayIso } from "@/features/planning/tripDate"
import { packContent } from "../content"
import { gearRows, type GearRow } from "../gearCategories"
import { countGearRows, wholeNumber, wholePercent } from "../presentation"
import type { PackRecommendation, TrailWeather } from "../types/pack"

type PackBriefingProps = {
  pack: PackRecommendation
  /** The trip date the pack was requested for, `YYYY-MM-DD`. */
  tripDate: string
}

/**
 * The gear briefing (FEATURE-004 sections 17–19, 21.12–21.14): packing
 * readiness, the recommended gear with Owned or Missing for each, and the
 * forecast the list was built for. In that order, which is the order of
 * importance (D21).
 *
 * Everything shown is what the pack response returned. Nothing here works
 * out ownership, readiness, or a weather rule, and nothing can be ticked,
 * selected, or equipped: that is the next feature's.
 */
export function PackBriefing({ pack, tripDate }: PackBriefingProps) {
  const rows = gearRows(pack.requiredGear)
  const weatherUnavailable = pack.weather === null

  return (
    <div className="prep-briefing-content">
      {/* With nothing recommended the backend still answers 100; a
          percentage would overstate, so the block is not shown (G9). */}
      {rows.length > 0 ? (
        <PackingReadiness percentage={pack.readinessPercentage} />
      ) : null}

      <RecommendedGear rows={rows} weatherUnavailable={weatherUnavailable} />

      <Forecast weather={pack.weather} tripDate={tripDate} />
    </div>
  )
}

/**
 * The backend's number, as returned, with a meter drawn from the same number
 * (section 21.12). One appearance at every value: no threshold, no verdict
 * color, and nothing extra at 100%. The number is always present as text.
 */
function PackingReadiness({ percentage }: { percentage: number }) {
  const headingId = useId()
  const { readiness } = packContent
  const shown = wholePercent(percentage)

  return (
    <section className="prep-block" aria-labelledby={headingId}>
      <div className="prep-readiness-row">
        <h2
          id={headingId}
          tabIndex={-1}
          className="prep-heading trip-focus-target"
        >
          {readiness.heading}
        </h2>
        <p className="prep-readiness-value">{shown}%</p>
      </div>

      <div
        className="prep-meter"
        role="meter"
        aria-labelledby={headingId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${shown}% ${readiness.valueText}`}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>

      <p className="prep-note">{readiness.explanation}</p>
    </section>
  )
}

type RecommendedGearProps = {
  rows: GearRow[]
  weatherUnavailable: boolean
}

/**
 * A short list read top to bottom (section 21.13). A row is static text: not
 * a link, a button, a checkbox, or a toggle. Owned and Missing differ by the
 * word, the icon's shape, and the label's weight, never by color alone.
 * There is no per-category icon and no action on a missing row.
 */
function RecommendedGear({ rows, weatherUnavailable }: RecommendedGearProps) {
  const headingId = useId()
  const { gear } = packContent
  const counts = countGearRows(rows)

  // A part whose count is zero is left out.
  const countLine = [
    counts.missing > 0 ? `${counts.missing} ${gear.missing}` : null,
    counts.owned > 0 ? `${counts.owned} ${gear.owned}` : null,
  ]
    .filter((part) => part !== null)
    .join(" · ")

  return (
    <section className="prep-block" aria-labelledby={headingId}>
      <h2 id={headingId} tabIndex={-1} className="prep-heading trip-focus-target">
        {gear.heading}
      </h2>

      {rows.length > 0 ? (
        <>
          <p className="prep-line">{countLine}</p>

          {weatherUnavailable ? (
            <p className="prep-caveat">
              <Info aria-hidden="true" strokeWidth={2} />
              <span>{gear.noForecastList}</span>
            </p>
          ) : null}

          <ul className="prep-gear">
            {rows.map((row) => (
              <li
                key={row.key}
                className="prep-gear-row"
                data-owned={row.owned ? "" : undefined}
              >
                <span className="prep-gear-label">{row.label}</span>
                <span className="sr-only">, </span>
                <span className="prep-gear-state">
                  {row.owned ? (
                    <CircleCheck aria-hidden="true" strokeWidth={2} />
                  ) : (
                    <CircleDashed aria-hidden="true" strokeWidth={2} />
                  )}
                  {row.owned ? gear.stateOwned : gear.stateMissing}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="prep-statement">{gear.none}</p>

          {weatherUnavailable ? (
            <p className="prep-caveat">
              <Info aria-hidden="true" strokeWidth={2} />
              <span>{gear.noForecast}</span>
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

type ForecastProps = {
  weather: TrailWeather | null
  tripDate: string
}

/**
 * The conditions the list was built for (sections 17, 21.14): three numbers
 * with honest labels. The temperature is the day's average, not a high or a
 * low; the other two are the day's maxima. No condition word, no icon chosen
 * from the numbers, no advice, and no statement about whether the day suits
 * the hike.
 */
function Forecast({ weather, tripDate }: ForecastProps) {
  const headingId = useId()
  const { forecast } = packContent

  return (
    <section className="prep-block" aria-labelledby={headingId}>
      <h2 id={headingId} tabIndex={-1} className="prep-heading trip-focus-target">
        {forecast.heading}
      </h2>

      {weather !== null ? (
        <>
          <p className="prep-line">
            {forecast.captionStart} {formatTripDateShort(tripDate, todayIso())}
            {forecast.captionEnd}
          </p>

          <dl className="prep-forecast">
            <div className="prep-forecast-row">
              <dt>{forecast.temperature}</dt>
              <dd>
                {wholeNumber(weather.temperatureC)}
                {forecast.units.temperature}
              </dd>
            </div>
            <div className="prep-forecast-row">
              <dt>{forecast.precipitation}</dt>
              <dd>
                {wholeNumber(weather.precipitationProbability)}
                {forecast.units.precipitation}
              </dd>
            </div>
            <div className="prep-forecast-row">
              <dt>{forecast.wind}</dt>
              <dd>
                {wholeNumber(weather.windSpeedKmh)}
                {forecast.units.wind}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="prep-statement">{forecast.unavailable}</p>
      )}
    </section>
  )
}
