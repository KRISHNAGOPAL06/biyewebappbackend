// import { logger } from '../../utils/logger.js';

// const PROFANITY_PATTERNS = [
//   /\bbadword1\b/gi,    // Placeholder: Replace with actual bad words
//   /\bbadword2\b/gi,    // Replace with real words for testing

//   // Common example bad words (these are just for testing purposes, replace as needed)
//   /\bdamn\b/gi,
//   /\bshit\b/gi,
//   /\bfuck\b/gi,
//   /\basshole\b/gi,
//   /\bidiot\b/gi,
//   /\bbitch\b/gi,
//   /\bcunt\b/gi,
//   /\bslut\b/gi,
//   /\bwhore\b/gi,
//   /\bprick\b/gi,
//   /\bshithead\b/gi,
//   /\bfuckhead\b/gi,
//   /\bsuck\b/gi,
//   /\bmotherfucker\b/gi,
//   /\bdyke\b/gi,
//   /\bretard\b/gi,
//   /\bcrap\b/gi
// ];

// export class ProfanityService {
//   private patterns: RegExp[];

//   constructor(customPatterns?: RegExp[]) {
//     this.patterns = customPatterns || PROFANITY_PATTERNS;
//   }

//   isClean(text: string): boolean {
//     if (!text) return true;

//     for (const pattern of this.patterns) {
//       if (pattern.test(text)) {
//         logger.warn('Profanity detected in message');
//         return false;
//       }
//     }

//     return true;
//   }

//   containsProfanity(text: string): boolean {
//     return !this.isClean(text);
//   }

//   filter(text: string, replacement: string = '***'): string {
//     let filtered = text;
//     for (const pattern of this.patterns) {
//       filtered = filtered.replace(pattern, replacement);
//     }
//     return filtered;
//   }

//   addPattern(pattern: RegExp): void {
//     this.patterns.push(pattern);
//   }
// }

// export const profanityService = new ProfanityService();


import { logger } from '../../utils/logger.js';
import { Filter } from 'bad-words';

// Regex pattern to detect phone numbers (common formats)
const PHONE_NUMBER_PATTERN = /\+?[0-9\s\-\(\)]{7,15}/g;

// Extend ProfanityService to use the bad-words filter
export class ProfanityService {
  private badWordsFilter: Filter; // renamed from `filter`

  constructor() {
    this.badWordsFilter = new Filter(); // Initialize filter directly as a class property
  }

  isClean(text: string): boolean {
    if (!text) return true;

    // Check if the text contains any profanity
    const containsProfanity = this.badWordsFilter.isProfane(text);

    if (containsProfanity) {
      logger.warn('Profanity detected in message');
      return false;
    }

    // Check for phone numbers
    if (this.containsPhoneNumber(text)) {
      logger.warn('Phone number detected in message');
      return false;
    }


    return true;
  }

  containsProfanity(text: string): boolean {
    return !this.isClean(text);
  }
  // Check if the text contains a phone number
  containsPhoneNumber(text: string): boolean {
    const matches = text.match(PHONE_NUMBER_PATTERN);
    return !!matches && matches.length > 0;
  }

  filter(text: string, phoneReplacement: string = '[PHONE]'): string {

    let filtered = text;

    // Replace profanity
    filtered = this.badWordsFilter.clean(filtered);

    // Replace phone numbers
    filtered = filtered.replace(PHONE_NUMBER_PATTERN, phoneReplacement);

    return filtered;
    // Replace any profane words with the replacement string
    // return this.badWordsFilter.clean(text);
  }

  addCustomWord(word: string): void {
    // Add a custom word to the filter (if needed)
    this.badWordsFilter.addWords(word);
  }

  removeCustomWord(word: string): void {
    // Remove a custom word from the filter
    this.badWordsFilter.removeWords(word);
  }
}

// Create a singleton instance
export const profanityService = new ProfanityService();
