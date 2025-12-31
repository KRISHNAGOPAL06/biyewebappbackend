
/**
 * Masks a Registered User ID (TBCo ID) for privacy.
 * Format: TBCo_29xxxxx01
 * Keeps prefix, first 2 digits, and last 2 digits visible.
 */
export const maskRegisteredId = (id: string | null | undefined): string => {
    if (!id) return 'Unknown User';

    // If it's not a TBCo ID, just return it (or masked version of it)
    if (!id.startsWith('TBCo_')) {
        return 'User';
    }

    const parts = id.split('_');
    if (parts.length < 2) return id;

    const prefix = parts[0]; // TBCo
    const numberPart = parts[1];

    if (numberPart.length < 5) {
        return `${prefix}_xxxx`;
    }

    const firstTwo = numberPart.substring(0, 2);
    const lastTwo = numberPart.substring(numberPart.length - 2);

    return `${prefix}_${firstTwo}xxxxx${lastTwo}`;
};
