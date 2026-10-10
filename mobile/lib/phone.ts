export function normalizePhoneNumber(raw: string): string {
  if (!raw) return ''
  let clean = raw.replace(/[\s\-\.\(\)\/]/g, '')
  if (!clean) return ''

  // Replace leading 00 with +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2)
  }

  // Kosovo mobiles 044–049 + 6 digits, and Kosovo landlines 028/029.
  if (/^0(4[4-9])\d{6}$/.test(clean) || /^0(28|29)\d{5,6}$/.test(clean)) {
    clean = '+383' + clean.slice(1)
  }
  // Albania mobiles 06x, then remaining Albanian landlines (02/03/04/05).
  else if (/^06\d{8}$/.test(clean) || /^0[2-5]\d{7}$/.test(clean)) {
    clean = '+355' + clean.slice(1)
  }
  // If starts with 383 without +
  else if (clean.startsWith('383') && !clean.startsWith('+383')) {
    clean = '+' + clean
  }
  // If starts with 355 without +
  else if (clean.startsWith('355') && !clean.startsWith('+355')) {
    clean = '+' + clean
  }
  // Kosovo 8 digits without leading 0 or prefix e.g. 44123456 or 46814700
  else if (!clean.startsWith('+') && /^(3|4)\d{7}$/.test(clean)) {
    clean = '+383' + clean
  }

  return clean
}

export function formatPhoneDisplay(phone: string): string {
  const norm = normalizePhoneNumber(phone)
  if (!norm) return phone

  // Format +383 4X XXX XXX
  if (norm.startsWith('+383') && norm.length === 12) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`
  }

  // Format +355 6X XXX XXXX
  if (norm.startsWith('+355') && norm.length === 13) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`
  }

  return norm
}
