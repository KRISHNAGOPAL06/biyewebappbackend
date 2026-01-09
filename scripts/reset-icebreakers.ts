
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

async function resetIcebreakers() {
    console.log('Connecting to Redis at:', redisUrl);

    try {
        // Find all keys matching the icebreaker count pattern
        const stream = redis.scanStream({
            match: 'icebreaker:count:*',
            count: 100
        });

        let keysToDelete: string[] = [];

        stream.on('data', (resultKeys) => {
            keysToDelete = keysToDelete.concat(resultKeys);
        });

        stream.on('end', async () => {
            if (keysToDelete.length === 0) {
                console.log('No icebreaker usage records found to reset.');
                redis.disconnect();
                return;
            }

            console.log(`Found ${keysToDelete.length} usage records. Deleting...`);
            await redis.del(...keysToDelete);
            console.log('Successfully reset all icebreaker counts to 0 (Full Quota restored).');
            redis.disconnect();
        });

    } catch (error) {
        console.error('Error resetting icebreakers:', error);
        redis.disconnect();
    }
}

resetIcebreakers();
