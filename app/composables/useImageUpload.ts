// Uploads one image straight from the browser to Cloudinary (Vercel limits request bodies to about 4.5 MB, and 1600px screens are often bigger).
// Flow: ask our admin-only endpoint for a signature, then POST the file to Cloudinary with progress. Cloudinary answers with the real width and height.
import { ALLOWED_FORMATS, ALLOWED_MIME, MAX_UPLOAD_BYTES, type ImageKind, type ProjectImage } from '#shared/project'

interface Signature {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  allowedFormats: string
  signature: string
  uploadUrl: string
}

/** A message for a file that cannot be uploaded, or null when it is fine. Runs in the browser before anything is sent. */
export function checkFile(file: File, kind: ImageKind): string | null {
  if (!ALLOWED_MIME[kind].includes(file.type)) {
    const names = ALLOWED_FORMATS[kind].map((f) => (f === 'jpg' ? 'JPG' : f.toUpperCase())).join(', ')
    return `${file.name}: use ${names}.`
  }
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
  return null
}

export function useImageUpload() {
  /** Uploads the file and resolves with the stored image. Rejects with an Error whose message can be shown to the person. */
  async function upload(file: File, kind: ImageKind, onProgress: (percent: number) => void): Promise<ProjectImage> {
    const problem = checkFile(file, kind)
    if (problem) throw new Error(problem)

    let sig: Signature
    try {
      sig = await adminFetch<Signature>('/api/admin/uploads/sign', { method: 'POST', body: { kind } })
    } catch (e) {
      throw new Error(messageFrom(e, 'Could not start the upload.'))
    }

    const form = new FormData()
    form.append('file', file)
    form.append('api_key', sig.apiKey)
    form.append('timestamp', String(sig.timestamp))
    form.append('folder', sig.folder)
    form.append('allowed_formats', sig.allowedFormats)
    form.append('signature', sig.signature)

    return new Promise<ProjectImage>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', sig.uploadUrl)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100))
      }
      xhr.onerror = () => reject(new Error(`${file.name}: the upload failed. Check your connection.`))
      xhr.onload = () => {
        let body: { secure_url?: string, public_id?: string, width?: number, height?: number, error?: { message?: string } } = {}
        try {
          body = JSON.parse(xhr.responseText)
        } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url && body.public_id && body.width && body.height) {
          onProgress(100)
          resolve({ url: body.secure_url, publicId: body.public_id, width: body.width, height: body.height })
        } else {
          reject(new Error(`${file.name}: ${body.error?.message ?? 'the upload was refused.'}`))
        }
      }
      xhr.send(form)
    })
  }

  /** Deletes an image that was uploaded but never saved. Best effort: a leftover file is harmless. */
  async function discard(image: ProjectImage): Promise<void> {
    try {
      await adminFetch('/api/admin/uploads/discard', { method: 'POST', body: { publicId: image.publicId } })
    } catch { /* ignore */ }
  }

  return { upload, discard }
}
