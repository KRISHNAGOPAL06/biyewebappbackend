import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { eventBus, SubscriptionEvent } from '../../events/eventBus.js';
import { subscriptionService } from './subscription.service.js';

/**
 * Attach subscription gateway to Socket.IO server
 * Listens for subscription events from eventBus and broadcasts to users
 */
export function attachSubscriptionGateway(io: Server): void {

    // Listen for subscription updates from eventBus
    eventBus.onSubscriptionUpdate(async (event: SubscriptionEvent) => {
        try {
            const syncEnabled = process.env.SUBSCRIPTION_SYNC_ENABLED !== 'false';

            if (!syncEnabled) {
                logger.debug('Subscription sync disabled, skipping WebSocket broadcast');
                return;
            }

            // Broadcast to user's room
            const userRoom = `user:${event.userId}`;

            io.to(userRoom).emit('subscription:updated', {
                eventType: event.eventType,
                subscription: {
                    id: event.subscription.id,
                    planCode: event.subscription.planCode,
                    planName: event.subscription.planName,
                    status: event.subscription.status,
                    startDate: event.subscription.startDate,
                    endDate: event.subscription.endDate,
                    features: event.subscription.features,
                },
                timestamp: new Date().toISOString(),
            });

            logger.info('Subscription update broadcasted via WebSocket', {
                userId: event.userId,
                profileId: event.profileId,
                eventType: event.eventType,
                planCode: event.subscription.planCode,
            });
        } catch (error) {
            logger.error('Error broadcasting subscription update', { error });
        }
    });

    // Add subscription-specific socket handlers
    io.on('connection', (socket: Socket) => {
        // Handle subscription status request
        socket.on('subscription:get', async () => {
            try {
                const userId = (socket as any).data?.userId;
                if (!userId) {
                    socket.emit('subscription:error', { message: 'Not authenticated' });
                    return;
                }

                // Get active subscription for profile
                // Note: We need profileId, but may need to look it up from userId
                const subscription = await getActiveSubscriptionForUser(userId);

                if (subscription) {
                    socket.emit('subscription:status', {
                        id: subscription.id,
                        planCode: subscription.planCode,
                        planName: subscription.planName,
                        status: subscription.status,
                        startDate: subscription.startDate,
                        endDate: subscription.endDate,
                        features: subscription.features,
                    });
                } else {
                    socket.emit('subscription:status', null);
                }
            } catch (error) {
                logger.error('Error fetching subscription status', { error });
                socket.emit('subscription:error', { message: 'Failed to fetch subscription' });
            }
        });
    });

    logger.info('Subscription gateway attached to Socket.IO server');
}

/**
 * Helper to get active subscription for a user
 * Looks up profile and then subscription
 */
async function getActiveSubscriptionForUser(userId: string): Promise<any | null> {
    try {
        // Import prisma here to avoid circular dependency
        const { prisma } = await import('../../prisma.js');

        // Find profile for user
        const profile = await prisma.profile.findFirst({
            where: { userId },
        });

        if (!profile) {
            return null;
        }

        // Get active subscription
        const subscription = await subscriptionService.getActiveSubscription(profile.id);
        return subscription;
    } catch (error) {
        logger.error('Error getting subscription for user', { userId, error });
        return null;
    }
}

/**
 * Emit subscription update (called from subscription service)
 */
export function emitSubscriptionUpdate(
    userId: string,
    profileId: string,
    eventType: SubscriptionEvent['eventType'],
    subscription: SubscriptionEvent['subscription']
): void {
    eventBus.emitSubscriptionUpdate({
        userId,
        profileId,
        eventType,
        subscription,
    });
}
