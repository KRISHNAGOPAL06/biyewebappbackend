// services/threadParticipant.resolver.ts
import { prisma } from '../../prisma.js';


import { maskRegisteredId } from '../../utils/mask.helper.js';

export class ThreadParticipantResolver {
  static async resolveProfilesByUserIds(
    otherUserIds: string[]
  ): Promise<Map<string, any>> {
    if (otherUserIds.length === 0) {
      return new Map();
    }

    // 1️⃣ Fetch users
    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
    });
    console.log(`[Resolver] Requested IDs: ${otherUserIds.join(', ')}`);
    console.log(`[Resolver] Found Users: ${users.map(u => `${u.id} (${u.role})`).join(', ')}`);

    const userMap = new Map(users.map(u => [u.id, u]));

    // 2️⃣ Separate roles
    const parentIds: string[] = [];
    const guardianIds: string[] = [];
    const directUserIds: string[] = [];

    for (const user of users) {
      if (user.role === 'self' || user.role === 'candidate') {
        directUserIds.push(user.id);
      } else if (user.role === 'parent') {
        parentIds.push(user.id);
      } else if (user.role === 'guardian') {
        guardianIds.push(user.id);
      } else {
        // Fallback: treat as direct user (self)
        directUserIds.push(user.id);
      }
    }

    // 3️⃣ Fetch candidate links
    const links = await prisma.candidateLink.findMany({
      where: {
        status: 'active',
        OR: [
          { parentUserId: { in: parentIds } },
          { childUserId: { in: guardianIds } },
        ],
      },
      include: { profile: true },
    });

    const resolvedCandidateUserId = new Map<string, string>();

    for (const link of links) {
      if (link.parentUserId) {
        resolvedCandidateUserId.set(
          link.parentUserId,
          link.profile.userId
        );
      }
      if (link.childUserId) {
        resolvedCandidateUserId.set(
          link.childUserId,
          link.profile.userId
        );
      }
    }

    // 4️⃣ Final candidate userIds
    const finalUserIds = [
      ...directUserIds,
      ...Array.from(resolvedCandidateUserId.values()),
    ];

    // 5️⃣ Fetch profiles
    const profiles = await prisma.profile.findMany({
      where: {
        userId: { in: finalUserIds },
      },
      include: { photos: { take: 1 } }
    });
    console.log(`[Resolver] Fetched ${profiles.length} profiles from DB`);
    console.log(`[Resolver] Profile UserIDs found: ${profiles.map(p => p.userId).join(', ')}`);

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    // 6️⃣ Map original userId → profile (with masked name)
    const result = new Map<string, any>();

    for (const userId of otherUserIds) {
      const user = userMap.get(userId);

      if (!user) {
        console.warn(`[Resolver] User not found in DB for ID: ${userId}`);
        result.set(userId, null);
        continue;
      }

      console.log(`[Resolver] Processing User: ${userId} | Role: ${user.role}`);

      let profile = null;
      if (user.role === 'parent') {
        const candidateUserId = resolvedCandidateUserId.get(user.id);
        console.log(`[Resolver] Parent ${userId} -> Candidate ${candidateUserId}`);
        profile = candidateUserId ? profileMap.get(candidateUserId) ?? null : null;
      } else if (user.role === 'guardian') {
        const candidateUserId = resolvedCandidateUserId.get(user.id);
        console.log(`[Resolver] Guardian ${userId} -> Candidate ${candidateUserId}`);
        profile = candidateUserId ? profileMap.get(candidateUserId) ?? null : null;
      } else {
        // self, candidate, or unknown (fallback)
        console.log(`[Resolver] Direct lookup for ${userId}`);
        profile = profileMap.get(user.id) ?? null;
      }

      if (!profile) {
        console.warn(`[Resolver] FAILED to resolve profile for ${userId} (Role: ${user.role})`);
      } else {
        console.log(`[Resolver] SUCCESS resolving profile for ${userId}:`, profile.registeredUserId);
      }

      // Attach masked name
      if (profile) {
        (profile as any).maskedName = maskRegisteredId((profile as any).registeredUserId);
      }

      result.set(userId, profile);
    }

    return result;
  }
}

