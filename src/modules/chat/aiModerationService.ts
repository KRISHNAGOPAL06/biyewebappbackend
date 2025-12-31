// aiModerationService.ts
import { logger } from '../../utils/logger.js';

const OPENAI_MODERATION_API_URL = 'https://api.openai.com/v1/moderations';

export interface ModerationResult {
    isFlagged: boolean;
    categoryFlags: string[];
    categoryScores: Record<string, number>;
}

export class AIModerationService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async moderateContent(text: string): Promise<ModerationResult> {
        try {
            const response = await fetch(OPENAI_MODERATION_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'omni-moderation-latest', // GPT-4o based model[citation:8]
                    input: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }
            console.log(response)

            // const data = await response.json();
            // console.log(data)
            // const result = data.results[0];
            const data = await response.json();
            console.log(data);

            const result = (data as { results: any[] }).results[0];

            // Extract flagged categories with high confidence
            const flaggedCategories: string[] = [];
            const categoryScores: Record<string, number> = {};

            for (const [category, flagged] of Object.entries(result.categories)) {
                categoryScores[category] = result.category_scores[category];
                // Use a threshold (e.g., 0.7) to determine a positive flag
                if (flagged && result.category_scores[category] > 0.7) {
                    flaggedCategories.push(category);
                }
            }

            return {
                isFlagged: result.flagged,
                categoryFlags: flaggedCategories,
                categoryScores: categoryScores
            };

        } catch (error) {
            logger.error('AI moderation service failed:', error);
            // Fallback: be safe and flag for manual review
            return {
                isFlagged: true,
                categoryFlags: ['error'],
                categoryScores: { error: 1.0 }
            };
        }
    }

    // Optional: Use GPT-4 to intelligently filter/rewrite content[citation:6]
    async getFilteredContent(text: string): Promise<string> {
        // Implementation for intelligent rewriting would go here
        // This is more complex and involves the Chat Completions API
        return text; // Placeholder
    }
}