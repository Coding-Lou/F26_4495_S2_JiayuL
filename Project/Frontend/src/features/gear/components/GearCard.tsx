import { itemCategoryText } from "../model/myGearModel"
import type { GearItem } from "../types/gear"
import { GearArt } from "./GearArt"

type GearCardProps = {
  item: GearItem
  selected: boolean
  /** The detail's id while the detail is rendered, for `aria-controls`. */
  detailId: string | null
  /** Plays the one-time arrival of a newly added item. */
  arrived: boolean
  onActivate: (id: string) => void
  onArrivalEnd: () => void
}

/**
 * One owned item as a slot (FEATURE-007 section 21.5): one `button` holding
 * the art, the name, and the category label, so its name is
 * "{name}, {category}" (MG10). Nothing else is on a card.
 */
export function GearCard({
  item,
  selected,
  detailId,
  arrived,
  onActivate,
  onArrivalEnd,
}: GearCardProps) {
  return (
    <li className="gear-slot">
      <button
        type="button"
        className="trip-control gear-card"
        data-gear-card={item.id}
        data-arrived={arrived ? "" : undefined}
        aria-expanded={selected}
        aria-controls={detailId ?? undefined}
        onClick={() => onActivate(item.id)}
        onAnimationEnd={arrived ? onArrivalEnd : undefined}
      >
        <GearArt category={item.category} variant="card" />
        <span className="gear-card-name">{item.name}</span>
        <span className="sr-only">, </span>
        <span className="gear-card-category">
          {itemCategoryText(item.category)}
        </span>
      </button>
    </li>
  )
}

/** A loading slot in the card's geometry (section 21.5). Static. */
export function GearCardSkeleton() {
  return (
    <li className="gear-slot" aria-hidden="true">
      <span className="gear-skeleton">
        <span className="gear-skeleton-plate" />
        <span className="gear-skeleton-bar" />
        <span className="gear-skeleton-bar" data-short="" />
      </span>
    </li>
  )
}
