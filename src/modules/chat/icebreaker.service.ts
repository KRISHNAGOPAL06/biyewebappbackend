/**
 * Icebreaker Service
 * Pre-defined conversation starters for Alaap tier users
 */
import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';
import Redis from 'ioredis';

const ICEBREAKER_COUNT_PREFIX = 'icebreaker:count:';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Pre-defined icebreaker messages - curated conversation starters
export const ICEBREAKERS = {
    general: [
        "Hello! I noticed our profiles have something in common. Would you like to connect?",
        "Hi there! I'm interested in learning more about you. What do you enjoy doing in your free time?",
        "Namaste! I found your profile interesting. What values matter most to you in a life partner?",
        "Hello! I believe meaningful connections start with genuine conversations. What brings you here?",
        "Hi! I'd love to know what makes you smile. Care to share?",
    ],
    hobbies: [
        "I see you enjoy reading! What's the last book that made an impact on you?",
        "I noticed we share a love for music. What kind of music speaks to your soul?",
        "Your travel photos are amazing! What's your dream destination?",
        "I love that you enjoy cooking! What's your signature dish?",
        "Arts and culture seem important to you. What's your favorite way to experience them?",
    ],
    values: [
        "Family seems very important to you, as it is to me. How do you envision your ideal family life?",
        "I appreciate your thoughtful profile. What traditions from your culture do you cherish most?",
        "Your career achievements are impressive! How do you balance professional and personal life?",
        "I value authenticity deeply. What does being true to yourself mean to you?",
        "Education clearly matters to you. What life lessons are most important to pass on?",
    ],
    bengali: [
        "নমস্কার! আপনার প্রোফাইল দেখে খুব ভালো লাগলো। আপনার সাথে পরিচিত হতে চাই।",
        "শুভেচ্ছা! আপনার শখগুলো জানতে ইচ্ছে হচ্ছে। কোন জিনিসগুলো আপনাকে খুশি করে?",
        "আপনার প্রোফাইল পড়ে মনে হলো আমাদের অনেক মিল আছে। কথা বলবেন?",
        "হ্যালো! জীবনসঙ্গীর মধ্যে কোন গুণগুলো আপনার কাছে সবচেয়ে গুরুত্বপূর্ণ?",
        "নমস্কার! পরিবার সম্পর্কে আপনার কী ভাবনা? আমিও পারিবারিক মানুষ।",
    ],
};

export interface IcebreakerMessage {
    id: string;
    category: string;
    text: string;
    language: 'en' | 'bn';
}

export class IcebreakerService {
    /**
     * Get all available icebreakers
     */
    getAllIcebreakers(): IcebreakerMessage[] {
        const icebreakers: IcebreakerMessage[] = [];

        Object.entries(ICEBREAKERS).forEach(([category, messages]) => {
            messages.forEach((text, index) => {
                icebreakers.push({
                    id: `${category}-${index}`,
                    category,
                    text,
                    language: category === 'bengali' ? 'bn' : 'en',
                });
            });
        });

        return icebreakers;
    }

    /**
     * Get icebreakers by category
     */
    getIcebreakersByCategory(category: keyof typeof ICEBREAKERS): IcebreakerMessage[] {
        const messages = ICEBREAKERS[category] || [];
        return messages.map((text, index) => ({
            id: `${category}-${index}`,
            category,
            text,
            language: category === 'bengali' ? 'bn' : 'en',
        }));
    }

    /**
     * Get random icebreakers (mix of categories)
     */
    getRandomIcebreakers(count: number = 5): IcebreakerMessage[] {
        const all = this.getAllIcebreakers();
        const shuffled = all.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Get remaining icebreaker count for the month
     */
    async getRemainingIcebreakers(profileId: string): Promise<number> {
        const monthKey = this.getMonthKey();
        const countKey = `${ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;

        try {
            const count = await redis.get(countKey);
            const usedCount = parseInt(count || '0', 10);

            // Get user's plan limits
            const limit = await this.getIcebreakerLimit(profileId);

            return Math.max(0, limit - usedCount);
        } catch (error) {
            logger.error('[Icebreaker] Error getting remaining count', { error, profileId });
            return 0;
        }
    }

    /**
     * Increment icebreaker usage
     */
    async incrementUsage(profileId: string): Promise<void> {
        const monthKey = this.getMonthKey();
        const countKey = `${ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;

        try {
            await redis.incr(countKey);
            // Set expiry to end of month + 1 day buffer
            const daysUntilEndOfMonth = this.getDaysUntilEndOfMonth();
            await redis.expire(countKey, (daysUntilEndOfMonth + 1) * 24 * 60 * 60);

            logger.info('[Icebreaker] Usage incremented', { profileId, monthKey });
        } catch (error) {
            logger.error('[Icebreaker] Error incrementing usage', { error, profileId });
        }
    }

    /**
     * Check if user can send icebreaker
     */
    async canSendIcebreaker(profileId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
        const remaining = await this.getRemainingIcebreakers(profileId);
        const limit = await this.getIcebreakerLimit(profileId);

        return {
            allowed: remaining > 0,
            remaining,
            limit,
        };
    }

    /**
     * Get icebreaker limit from user's plan
     */
    private async getIcebreakerLimit(profileId: string): Promise<number> {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    profileId,
                    status: 'active',
                    endAt: { gt: new Date() },
                },
                include: { plan: true },
                orderBy: { createdAt: 'desc' },
            });

            if (!subscription) {
                return 5; // Default for free tier
            }

            const features = subscription.plan.features as any;
            return features?.icebreakersPerMonth || 5;
        } catch (error) {
            logger.error('[Icebreaker] Error getting limit', { error, profileId });
            return 5;
        }
    }

    private getMonthKey(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    private getDaysUntilEndOfMonth(): number {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.getDate() - now.getDate();
    }
}

export const icebreakerService = new IcebreakerService();
