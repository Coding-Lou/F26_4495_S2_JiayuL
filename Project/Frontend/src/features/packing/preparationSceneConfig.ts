/**
 * The Trip Preparation background (FEATURE-004 section 14.1): one static,
 * pre-rendered image of a room where a pack is being filled. The file is
 * used as delivered (D13): not renamed, re-encoded, resized, or imported.
 * Replacing the scene means changing this one path, not the layout.
 *
 * The file's name has a space, which is percent-encoded in its address.
 * How the image is cropped at each width is presentation and lives in
 * `packing.css`.
 */
export type PreparationSceneAsset = {
  image: string
}

export const preparationScene: PreparationSceneAsset = {
  image: "/media/img/preparation%20bg.png",
}
