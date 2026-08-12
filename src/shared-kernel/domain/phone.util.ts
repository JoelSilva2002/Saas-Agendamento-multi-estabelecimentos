/**
 * Normalizes a Brazilian phone number — however a client typed it: with/without country code,
 * spaces, parentheses, dashes — into E.164 digits with no leading '+'. That's the shape the
 * WhatsApp Business/Cloud API (and most gateways sitting in front of it) expect in the "to"
 * field; a number in local format like "(11) 99999-0000" is rejected outright by a real
 * provider, even though it round-trips fine through this app's own storage and UI.
 *
 * Returns null when the input can't be confidently read as a valid BR number, so callers can
 * skip the WhatsApp channel for that recipient instead of sending a request the provider will
 * reject.
 */
export function toE164BR(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) {
    return null;
  }

  const localNumber =
    digits.length === 12 || digits.length === 13
      ? digits.startsWith('55')
        ? digits.slice(2)
        : null
      : digits.length === 10 || digits.length === 11
        ? digits
        : null;

  if (!localNumber || (localNumber.length !== 10 && localNumber.length !== 11)) {
    return null;
  }

  const areaCode = Number(localNumber.slice(0, 2));
  if (areaCode < 11 || areaCode > 99) {
    return null;
  }

  // An 11-digit local number must be a mobile: 2-digit DDD + '9' + 8-digit subscriber number.
  // A 10-digit one is a landline and has no such marker digit.
  if (localNumber.length === 11 && localNumber[2] !== '9') {
    return null;
  }

  return `55${localNumber}`;
}
