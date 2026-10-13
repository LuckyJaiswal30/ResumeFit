const CANDIDATE = /\+?\(?\d[\d().\-\s]{5,}\d/g
const YEAR_RANGE = /^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/

export function hasPhoneNumber(text: string) {
  return (text.match(CANDIDATE) ?? []).some((candidate) => {
    const digits = candidate.replace(/\D/g, '').length
    if (digits < 7 || digits > 15) return false
    return !YEAR_RANGE.test(candidate.replace(/^\D+/, ''))
  })
}
