const EDGES = [2400, 1800, 1400]
const QUALITIES = [0.9, 0.8, 0.7]

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Re-encodes a photo as a JPEG that fits in maxBytes, shrinking it only as far as it has to.
// Also turns formats the reader can't take (GIF, BMP, AVIF) into JPEG.
// Returns null when the browser can't decode it (HEIC outside Safari) or it still won't fit.
export async function shrinkImage(file: File, maxBytes: number): Promise<File | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }

  try {
    for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext('2d')
      if (!context) return null
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const quality of QUALITIES) {
        const blob = await toJpeg(canvas, quality)
        if (blob && blob.size <= maxBytes) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
          })
        }
      }
    }
    return null
  } finally {
    bitmap.close()
  }
}
