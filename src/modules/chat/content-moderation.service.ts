/**
 * Content Moderation Service
 * Filters profanity, phone numbers, emails, links, and personal information
 * STRICT MODE: Blocks ANY digit or number word
 */
import { logger } from '../../utils/logger.js';

// Common profanity words (English + Bengali transliterated)
const PROFANITY_LIST = [
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'cock', 'pussy', 'cunt', 'bastard',
    'whore', 'slut', 'damn', 'crap', 'piss', 'nigger', 'fag', 'retard',
    'asshole', 'motherfucker', 'bullshit', 'dumbass', 'jackass', 'dipshit',
    'wtf', 'stfu', 'fucking', 'fucked', 'fucker',
    'boka', 'gadha', 'ullu', 'pagol', 'chutiya', 'bhenchod', 'madarchod',
    'sala', 'harami', 'kutta', 'kanjar', 'randi', 'magi', 'kuttar baccha',
    'shala', 'nangta', 'chodon', 'gud', 'baal', 'lund', 'bhosda', 'chod',
    'bokachoda', 'haramjada', 'shuar', 'bancho',
];

const SLANG_LIST = [
    'sexy', 'hot', 'hookup', 'dating', 'timepass', 'masti', 'item',
    'patao', 'scene', 'setting', 'one night', 'casual',
    'fling', 'booty', 'dtf', 'fwb', 'nudes', 'pics', 'send pics',
];

// Number words - ANY of these will be blocked
const NUMBER_WORDS = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'ek', 'do', 'teen', 'char', 'paanch', 'chhe', 'saat', 'aath', 'nau', 'das',
    'shunya', 'shunno', 'hundred', 'thousand',
];

const PHONE_PATTERNS = [
    /\+?91[\s.-]?\d{10}/gi,
    /\+?880[\s.-]?\d{10}/gi,
    /\b\d{10}\b/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const URL_PATTERNS = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /\b[a-zA-Z0-9-]+\.(com|in|org|net|io|co|me)\b/gi,
];

const SOCIAL_MEDIA_PATTERNS = [
    /whatsapp/gi,
    /telegram/gi,
    /instagram/gi,
    /facebook/gi,
    /snapchat/gi,
    /insta/gi,
    /@[\w]{3,}/g,
    /wa\.me/gi,
    /t\.me/gi,
    /call\s*me/gi,
    /text\s*me/gi,
    /contact\s*me/gi,
    /my\s*(number|phone|mobile|cell)/gi,
];

export interface ModerationResult {
    allowed: boolean;
    reason?: string;
    blockedContent?: string;
    violationType?: 'profanity' | 'phone' | 'email' | 'link' | 'social_media' | 'slang' | 'suspicious_numbers';
}

export class ContentModerationService {
    checkProfanity(content: string): ModerationResult {
        for (const word of PROFANITY_LIST) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(content)) {
                logger.warn('[Moderation] Profanity blocked:', { word });
                return {
                    allowed: false,
                    reason: 'Your message contains inappropriate language.',
                    blockedContent: word,
                    violationType: 'profanity'
                };
            }
        }
        return { allowed: true };
    }

    checkSlang(content: string): ModerationResult {
        for (const word of SLANG_LIST) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(content)) {
                return {
                    allowed: false,
                    reason: 'Please use appropriate language.',
                    blockedContent: word,
                    violationType: 'slang'
                };
            }
        }
        return { allowed: true };
    }

    checkPhoneNumbers(content: string): ModerationResult {
        // Block ANY digit
        if (/\d/.test(content)) {
            logger.warn('[Moderation] Number blocked:', { content });
            return {
                allowed: false,
                reason: 'Sharing numbers is not allowed for privacy. Please use in-app messaging.',
                violationType: 'suspicious_numbers'
            };
        }

        // Block ANY number word
        for (const word of NUMBER_WORDS) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(content)) {
                logger.warn('[Moderation] Number word blocked:', { word });
                return {
                    allowed: false,
                    reason: 'Sharing numbers (including number words) is not allowed.',
                    violationType: 'suspicious_numbers'
                };
            }
        }

        return { allowed: true };
    }

    checkEmails(content: string): ModerationResult {
        if (EMAIL_PATTERN.test(content)) {
            return {
                allowed: false,
                reason: 'Sharing email addresses is not allowed.',
                violationType: 'email'
            };
        }

        if (/(gmail|yahoo|hotmail|outlook)/i.test(content)) {
            return {
                allowed: false,
                reason: 'Sharing email service names is not allowed.',
                violationType: 'email'
            };
        }

        return { allowed: true };
    }

    checkLinks(content: string): ModerationResult {
        for (const pattern of URL_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    allowed: false,
                    reason: 'Sharing links is not allowed.',
                    violationType: 'link'
                };
            }
        }
        return { allowed: true };
    }

    checkSocialMedia(content: string): ModerationResult {
        for (const pattern of SOCIAL_MEDIA_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    allowed: false,
                    reason: 'Sharing contact details or social media is not allowed.',
                    violationType: 'social_media'
                };
            }
        }
        return { allowed: true };
    }

    moderateContent(content: string): ModerationResult {
        logger.info('[Moderation] Checking:', { content });

        const profanityCheck = this.checkProfanity(content);
        if (!profanityCheck.allowed) return profanityCheck;

        const slangCheck = this.checkSlang(content);
        if (!slangCheck.allowed) return slangCheck;

        const phoneCheck = this.checkPhoneNumbers(content);
        if (!phoneCheck.allowed) return phoneCheck;

        const emailCheck = this.checkEmails(content);
        if (!emailCheck.allowed) return emailCheck;

        const linkCheck = this.checkLinks(content);
        if (!linkCheck.allowed) return linkCheck;

        const socialCheck = this.checkSocialMedia(content);
        if (!socialCheck.allowed) return socialCheck;

        logger.info('[Moderation] Message passed');
        return { allowed: true };
    }
}

export const contentModerationService = new ContentModerationService();
