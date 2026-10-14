import { inflateRawSync } from 'node:zlib'

// Just enough of the zip format to read the parts of a .docx or .odt. Entries are only
// inflated on request, and each is capped so a zip bomb can't exhaust memory.

const MAX_ENTRY_BYTES = 20 * 1024 * 1024
const MAX_ENTRIES = 2_000

export type ZipEntry = { name: string; size: number; read: () => Uint8Array }

export class ZipError extends Error {}

function findEndOfDirectory(view: DataView) {
  const earliest = Math.max(0, view.byteLength - 22 - 65_535)
  for (let offset = view.byteLength - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new ZipError('No zip directory found.')
}

export function readZip(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const directoryEnd = findEndOfDirectory(view)
  const count = view.getUint16(directoryEnd + 10, true)
  let offset = view.getUint32(directoryEnd + 16, true)
  if (count > MAX_ENTRIES) throw new ZipError('Too many entries.')

  const entries = new Map<string, ZipEntry>()
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new ZipError('Damaged zip directory.')
    }
    const method = view.getUint16(offset + 10, true)
    const packedSize = view.getUint32(offset + 20, true)
    const size = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength

    entries.set(name, {
      name,
      size,
      read() {
        if (size > MAX_ENTRY_BYTES) throw new ZipError(`${name} is too large.`)
        if (view.getUint32(localOffset, true) !== 0x04034b50) throw new ZipError('Damaged entry.')
        const start =
          localOffset +
          30 +
          view.getUint16(localOffset + 26, true) +
          view.getUint16(localOffset + 28, true)
        const packed = bytes.subarray(start, start + packedSize)
        if (method === 0) return packed
        if (method === 8)
          return new Uint8Array(inflateRawSync(packed, { maxOutputLength: MAX_ENTRY_BYTES }))
        throw new ZipError(`Unsupported compression in ${name}.`)
      },
    })
  }
  return entries
}

export function readZipText(entries: Map<string, ZipEntry>, name: string) {
  const entry = entries.get(name)
  return entry ? new TextDecoder().decode(entry.read()) : null
}
