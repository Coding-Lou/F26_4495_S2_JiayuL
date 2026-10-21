import { avatarManifest, type VisualCategory } from "./avatarManifest"

/**
 * The visibility rule of FEATURE-005 section 29.1, driven only by the
 * manifest. Three-free, so the shell can use it without the 3D chunk.
 *
 *   embedded node n is visible <=> (n not in avatar.defaultHidden OR
 *                                    n in show(c) for some c in E)
 *                                   AND n not in hide(c) for any c in E
 *
 * Hide always wins over show. A pure function of the equipped set E: it does
 * not depend on the order of equipping, on history, or on the item chosen.
 */

/** Every avatar node the manifest says anything about. */
export const MANAGED_NODES: readonly string[] = (() => {
  const names = new Set<string>(avatarManifest.avatar.defaultHidden)
  for (const entry of Object.values(avatarManifest.visuals)) {
    for (const name of entry.hide) {
      names.add(name)
    }
    if (entry.representation.kind === "embedded-variant") {
      for (const name of entry.representation.show) {
        names.add(name)
      }
    }
  }
  return [...names]
})()

/** The nodes an embedded variant shows; none for an attached model. */
export function shownNodes(visual: VisualCategory): readonly string[] {
  const { representation } = avatarManifest.visuals[visual]
  return representation.kind === "embedded-variant" ? representation.show : []
}

export function isAttached(visual: VisualCategory): boolean {
  return avatarManifest.visuals[visual].representation.kind === "attached-model"
}

/** The attached visual categories, in the manifest's order. */
export const ATTACHED_VISUALS: readonly VisualCategory[] = (
  Object.keys(avatarManifest.visuals) as VisualCategory[]
).filter(isAttached)

export function isNodeVisible(
  node: string,
  equipped: ReadonlySet<VisualCategory>,
): boolean {
  const hiddenByDefault = avatarManifest.avatar.defaultHidden.some(
    (name) => name === node,
  )
  let shown = !hiddenByDefault
  for (const visual of equipped) {
    if (avatarManifest.visuals[visual].hide.some((name) => name === node)) {
      return false
    }
    if (shownNodes(visual).includes(node)) {
      shown = true
    }
  }
  return shown
}

/**
 * Section 28.3: a category is covered when at least one node it shows is
 * hidden by another equipped category's hide list. In the MVP: the warm
 * layer under the rain shell.
 */
export function isCovered(
  visual: VisualCategory,
  equipped: ReadonlySet<VisualCategory>,
): boolean {
  return shownNodes(visual).some((node) => {
    for (const other of equipped) {
      if (
        other !== visual &&
        avatarManifest.visuals[other].hide.some((name) => name === node)
      ) {
        return true
      }
    }
    return false
  })
}
