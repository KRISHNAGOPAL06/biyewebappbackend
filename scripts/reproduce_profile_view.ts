import { prisma } from '../src/prisma.js';
import { profileService } from '../src/modules/profile/profile.service.js';
import { notificationDispatcher } from '../src/modules/notifications/notification.dispatcher.js';

async function main() {
    console.log('🚀 Starting profile view reproduction script...');

    try {
        // 1. Get 2 distinct users with profiles
        const profiles = await prisma.profile.findMany({
            take: 2,
            where: {
                userId: { not: undefined },
                published: true
            },
            select: { id: true, userId: true, registeredUserId: true }
        });

        if (profiles.length < 2) {
            console.error('❌ Need at least 2 profiles to test.');
            return;
        }

        const viewer = profiles[0];
        const target = profiles[1];

        console.log(`👤 Viewer: ${viewer.registeredUserId} (${viewer.userId})`);
        console.log(`🎯 Target: ${target.registeredUserId} (${target.userId})`);

        // 2. Count existing 'profile_view' notifications for target
        const countBefore = await prisma.notification.count({
            where: {
                userId: target.userId,
                type: 'profile_view'
            }
        });

        console.log(`📊 Notifications before: ${countBefore}`);

        // 2b. Listen explicitly to verify emission
        const { eventBus } = await import('../src/events/eventBus.js');
        eventBus.onNotification((event) => {
            console.log("📢 SCRIPT LISTENER: Received event:", event.type, event.userId);
        });

        // 3. Simulate view (Viewer views Target)
        console.log('👀 Simulating profile view...');

        // Create requester context for viewer
        const requester = {
            userId: viewer.userId,
            isOwner: false,
            isGuardian: false,
            isPremium: false
        };

        // Call service method which should trigger event emission
        await profileService.getProfileById(target.id, requester);

        // 4. Wait for event processing (it's async)
        console.log('⏳ Waiting for event dispatch...');
        await new Promise(r => setTimeout(r, 5000));

        // 5. Verify new count
        const countAfter = await prisma.notification.count({
            where: {
                userId: target.userId,
                type: 'profile_view'
            }
        });

        console.log(`📊 Notifications after: ${countAfter}`);

        // Debug: Check preferences
        const { notificationPreferenceService } = await import('../src/modules/notifications/notificationPreference.service.js');
        const prefs = await notificationPreferenceService.getPreferences(target.userId);
        console.log('⚙️ Target Preferences:', prefs);

        // Debug: Try direct save (bypass dispatcher)
        const { notificationService } = await import('../src/modules/notifications/notification.service.js');
        try {
            console.log('🧪 Attempting direct save...');
            await notificationService.createInAppNotification({
                userId: target.userId,
                type: 'profile_view',
                title: 'Direct Test View',
                body: 'Direct test body',
                metadata: { profileId: viewer.id },
                priority: 'LOW'
            });
            console.log('✅ Direct save success');
        } catch (e) {
            console.error('❌ Direct save failed:', e);
        }

        // Count again after direct save
        const countFinal = await prisma.notification.count({
            where: { userId: target.userId, type: 'profile_view' }
        });
        console.log(`📊 Notifications final: ${countFinal}`);

        if (countAfter > countBefore) {
            console.log('✅ SUCCESS: Event-based Notification created!');
        } else {
            console.log('❌ FAILURE: Event-based Notification NOT found.');
        }

    } catch (error) {
        console.error('❌ Error running script:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

main();
