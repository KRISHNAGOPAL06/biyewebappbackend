/**
 * Generates a unique registered user ID for profiles
 * Format: TBCo_XXXXXXXXX (where X are random digits)
 */
export function generateRegisteredUserId(): string {
  const randomDigits = Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000;
  return `TBCo_${randomDigits}`;
}
