import { shrinkImage } from './shrink-image'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const MAX_PAGES = 5
const FORM_OVERHEAD = 64 * 1024

export const ACCEPTED_FILES =
  '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.htm,.html,.pages,image/*,.heic,.heif'

// Formats the reader takes as they are. Other pictures are converted to JPEG first.
const READY_IMAGE = /\.(png|jpe?g|webp|heic|heif)$/i
const IMAGE_NAME = /\.(png|jpe?g|webp|heic|heif|gif|bmp|tiff?|avif)$/i
const NOT_A_RESUME = /^(video|audio)\//

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function isImage(file: File) {
  return file.type.startsWith('image/') || IMAGE_NAME.test(file.name)
}

type Prepared = { files: File[] } | { error: string }

async function fitImage(file: File, budget: number) {
  const ready = READY_IMAGE.test(file.name) || /^image\/(png|jpeg|webp|heic|heif)$/.test(file.type)
  if (ready && file.size <= budget) return file
  return shrinkImage(file, budget)
}

// Works out what to send: one document, or one to five photos of a resume's pages sharing
// the upload limit. A document replaces whatever was there; photos add to earlier photos.
export async function prepareFiles(incoming: File[], current: File[]): Promise<Prepared> {
  if (incoming.length === 0) return { files: current }
  if (incoming.some((file) => NOT_A_RESUME.test(file.type))) {
    return { error: 'That’s a video or audio file. Upload your resume, or photos of it.' }
  }

  const documents = incoming.filter((file) => !isImage(file))
  if (documents.length > 0) {
    if (incoming.length > 1) {
      return { error: 'Add one document, or up to five photos of its pages.' }
    }
    if (documents[0].size > MAX_UPLOAD_BYTES) {
      return { error: 'That file is over 4 MB. Try a smaller export.' }
    }
    return { files: documents }
  }

  const seen = new Set(current.map(fileKey))
  const pages = [...current.filter(isImage), ...incoming.filter((file) => !seen.has(fileKey(file)))]
  if (pages.length > MAX_PAGES) {
    return { error: `That’s more than ${MAX_PAGES} photos. Add one per page, up to ${MAX_PAGES}.` }
  }

  const budget = Math.floor((MAX_UPLOAD_BYTES - FORM_OVERHEAD) / pages.length)
  const fitted: File[] = []
  for (const page of pages) {
    const ready = await fitImage(page, budget)
    if (!ready) {
      return {
        error: /\.(heic|heif|tiff?)$/i.test(page.name)
          ? `${page.name} can’t be resized in this browser. Save it as a JPG, or use a screenshot.`
          : `${page.name} couldn’t be made small enough. Try a screenshot of the page instead.`,
      }
    }
    fitted.push(ready)
  }
  return { files: fitted }
}

export function describeFiles(files: File[]) {
  if (files.length <= 1) return files[0]?.name ?? ''
  return `${files[0].name} and ${files.length - 1} more page${files.length === 2 ? '' : 's'}`
}
