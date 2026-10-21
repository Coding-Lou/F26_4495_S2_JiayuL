/**
 * The signed-in user's durable owned inventory (FEATURE-005 section 35,
 * FEATURE-007): `GET`, `POST`, `PUT`, and `DELETE /api/users/me/gear`, their
 * contract types, response checking, the list as a query keyed by subject,
 * the add, update, and remove mutations, and the one category label map.
 *
 * It knows nothing about trips, recommendations, equipped gear, or 3D, and
 * imports nothing from `loadout`, `packing`, `avatar`, or `discover`. The My
 * Gear screen is imported by its route page directly, not from here, so no
 * screen that only needs the inventory loads it.
 */
export { gearFailureKindOf } from "./api/gearItems"
export {
  GEAR_CATEGORY_LABELS,
  OTHER_GEAR_LABEL,
  gearCategoryLabel,
} from "./categories"
export {
  gearItemsQueryKey,
  useAddGearItem,
  useGearItems,
} from "./hooks/useGearItems"
export {
  useRemoveGearItem,
  useUpdateGearItem,
  type UpdateGearItemVariables,
} from "./hooks/useGearItemChanges"
export {
  GEAR_CATEGORY_VALUES,
  GEAR_NAME_MAX_LENGTH,
  isGearCategory,
  type CreateGearItemRequest,
  type GearCategory,
  type GearFailureKind,
  type GearItem,
  type UpdateGearItemRequest,
} from "./types/gear"
