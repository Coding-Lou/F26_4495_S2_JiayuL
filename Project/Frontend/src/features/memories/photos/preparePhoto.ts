/**
 * Picking checks and client photo preparation (FEATURE-009 sections 11.2,
 * 11.3, D12, D13). Browser APIs only: one decode with the photo's own
 * orientation applied, one scale, one alpha check where it matters, one
 * encode.
 *
 * This is not a privacy control and claims nothing about metadata: the
 * server decodes and re-encodes every upload, and that is the only metadata
 * boundary (FEATURE-008 §10.2).
 */

/** Photos per Memory (section 11.1). */
export const MAX_PHOTOS = 5

/** Long edge of a prepared photo; never upscaled (D12). */
const MAX_EDGE = 2560

/** JPEG quality of an opaque prepared photo (D12). */
const JPEG_QUALITY = 0.88

/** A decoding-memory guard on the picked file (section 11.2). */
const MAX_SOURCE_BYTES = 40 * 1024 * 1024

/** The server's upload limit (FEATURE-008). */
const MAX_PREPARED_BYTES = 10 * 1024 * 1024

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i
const HEIC = /\.(heic|heif)$/i

/** The `accept` list of the picker: HEIC is not in it (section 11.1). */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp"

export type PhotoRejection = "format" | "too-large" | "unreadable"

export type PreparedPhoto = {
  blob: Blob
  /** `jpg` for an opaque photo, `png` for real transparency. */
  extension: "jpg" | "png"
}

type SourceKind = "jpeg" | "png" | "webp"

function sourceKind(file: File): SourceKind | null {
  const type = file.type.toLowerCase()
  if (ACCEPTED_TYPES.has(type)) {
    return type === "image/jpeg" ? "jpeg" : type === "image/png" ? "png" : "webp"
  }
  // A browser that reports no type at all: the name decides.
  if (type === "" && ACCEPTED_EXTENSIONS.test(file.name)) {
    const name = file.name.toLowerCase()
    return name.endsWith(".png") ? "png" : name.endsWith(".webp") ? "webp" : "jpeg"
  }
  return null
}

/**
 * The checks made the moment a file is picked (section 11.2). HEIC and HEIF
 * are refused in every browser, as is anything that is not JPEG, PNG, or
 * WebP (D13).
 */
export function checkPickedFile(file: File): PhotoRejection | null {
  const type = file.type.toLowerCase()
  if (type === "image/heic" || type === "image/heif" || HEIC.test(file.name)) {
    return "format"
  }
  if (sourceKind(file) === null) {
    return "format"
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "too-large"
  }
  return null
}

export class PhotoPreparationError extends Error {
  readonly rejection: PhotoRejection

  constructor(rejection: PhotoRejection) {
    super("Photo preparation failed")
    this.name = "PhotoPreparationError"
    this.rejection = rejection
  }
}

type Decoded = {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

/**
 * Decodes with the EXIF orientation applied. Where `createImageBitmap`
 * refuses, an image element from an object URL is used instead; current
 * browsers apply the orientation when such an image is drawn.
 */
async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    })
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  } catch {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = "async"
    image.src = url
    try {
      await image.decode()
    } catch {
      URL.revokeObjectURL(url)
      throw new PhotoPreparationError("unreadable")
    }
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

/** Whether any drawn pixel has alpha below 255. */
function hasTransparency(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const { data } = context.getImageData(0, 0, width, height)
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true
    }
  }
  return false
}

/**
 * Prepares one picked photo for upload (section 11.3): upright, the long
 * edge at most 2560 px, and JPEG 0.88 over white for every opaque photo, or
 * PNG when a PNG or WebP really has transparent pixels. Never WebP output.
 * Rejects with a `PhotoPreparationError`.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const kind = sourceKind(file)
  if (kind === null) {
    throw new PhotoPreparationError("format")
  }

  const decoded = await decode(file)
  const canvas = document.createElement("canvas")
  try {
    const { width, height } = decoded
    if (width <= 0 || height <= 0) {
      throw new PhotoPreparationError("unreadable")
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext("2d", { willReadFrequently: kind !== "jpeg" })
    if (context === null) {
      throw new PhotoPreparationError("unreadable")
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"

    let transparent = false
    if (kind === "jpeg") {
      // Always opaque: white beneath, then the photo.
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, targetWidth, targetHeight)
      context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight)
    } else {
      context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight)
      transparent = hasTransparency(context, targetWidth, targetHeight)
      if (!transparent) {
        // Opaque after all: white beneath, without changing a pixel.
        context.globalCompositeOperation = "destination-over"
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, targetWidth, targetHeight)
        context.globalCompositeOperation = "source-over"
      }
    }

    const blob = transparent
      ? await toBlob(canvas, "image/png")
      : await toBlob(canvas, "image/jpeg", JPEG_QUALITY)
    if (blob === null || blob.size === 0) {
      throw new PhotoPreparationError("unreadable")
    }
    if (blob.size > MAX_PREPARED_BYTES) {
      throw new PhotoPreparationError("too-large")
    }
    return { blob, extension: transparent ? "png" : "jpg" }
  } catch (error) {
    if (error instanceof PhotoPreparationError) {
      throw error
    }
    throw new PhotoPreparationError("unreadable")
  } finally {
    decoded.release()
    // Releases the canvas's backing store at once.
    canvas.width = 0
    canvas.height = 0
  }
}
