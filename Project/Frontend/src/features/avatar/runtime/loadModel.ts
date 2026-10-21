import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { avatarManifest } from "../avatarManifest"

/**
 * Loads one GLB from the application's own origin (FEATURE-005 sections 25,
 * 33, 34.3). No decoder is configured: the files use no compression. The
 * request carries no token: model files are public, generic assets.
 *
 * A load fails on a network error, a status outside 200–299, a body that
 * does not begin with `glTF` (a development server answers a missing file
 * with the application's HTML and status 200), a parse error, or no result
 * within `limitMs`, which covers the request and the parse.
 */
export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ModelLoadError"
  }
}

/** Base URL + path + `?v=` + manifest version (section 25.2). */
export function modelUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}?v=${avatarManifest.version}`
}

export async function loadModel(
  path: string,
  limitMs: number,
  priority: RequestPriority,
  cancel: AbortSignal,
): Promise<GLTF> {
  const controller = new AbortController()
  const abandon = () => controller.abort()
  cancel.addEventListener("abort", abandon)
  if (cancel.aborted) {
    controller.abort()
  }

  let timer: number | undefined
  const limit = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      controller.abort()
      reject(new ModelLoadError("timed out"))
    }, limitMs)
  })

  try {
    return await Promise.race([fetchAndParse(path, priority, controller.signal), limit])
  } finally {
    window.clearTimeout(timer)
    cancel.removeEventListener("abort", abandon)
  }
}

async function fetchAndParse(
  path: string,
  priority: RequestPriority,
  signal: AbortSignal,
): Promise<GLTF> {
  let response: Response
  try {
    response = await fetch(modelUrl(path), {
      signal,
      priority,
      credentials: "same-origin",
    })
  } catch {
    throw new ModelLoadError("network")
  }
  if (!response.ok) {
    throw new ModelLoadError("status")
  }

  const buffer = await response.arrayBuffer()
  const magic = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength))
  if (
    magic.length < 4 ||
    magic[0] !== 0x67 || // g
    magic[1] !== 0x6c || // l
    magic[2] !== 0x54 || // T
    magic[3] !== 0x46 //    F
  ) {
    throw new ModelLoadError("not glTF")
  }
  if (signal.aborted) {
    throw new ModelLoadError("abandoned")
  }

  try {
    return await new GLTFLoader().parseAsync(buffer, "")
  } catch {
    throw new ModelLoadError("parse")
  }
}
