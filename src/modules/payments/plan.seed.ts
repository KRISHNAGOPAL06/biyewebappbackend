import { PlanFeatures } from './payment.types.js';

import { prisma } from '../../prisma.js';

interface PlanSeed {
  code: string;
  name: string;
  price: number;
  durationDays: number;
  isInviteOnly: boolean;
  category: string,
  features: PlanFeatures;
}

// const plans: PlanSeed[] = [
//   {
//     code: 'ALAAP',
//     name: 'Alaap',
//     price: 0,
//     durationDays: 30,
//     isInviteOnly: false,
//     features: {
//       photos: 3,
//       messaging: false,
//       icebreakersPerMonth: 3,
//       parentIcebreakers: 3,
//       filters: ['age', 'religion', 'district'],
//       verification: 'selfie',
//       stealth: false,
//       boosts: 0,
//       spotlight: 0,
//     },
//   },
//   {
//     code: 'JATRA',
//     name: 'Jatra',
//     price: 999,
//     durationDays: 30,
//     isInviteOnly: false,
//     features: {
//       photos: 6,
//       messaging: {
//         newChatsPerMonth: 5,
//         messagesPerChat: 40,
//       },
//       boosts: 2,
//       spotlight: 1,
//       filters: ['age', 'religion', 'district', 'education', 'profession', 'lifestyle'],
//       verification: 'silver',
//       stealth: false,
//       icebreakersPerMonth: 10,
//       parentIcebreakers: 10,
//     },
//   },
//   {
//     code: 'AALOK',
//     name: 'Aalok',
//     price: 2499,
//     durationDays: 30,
//     isInviteOnly: false,
//     features: {
//       photos: 10,
//       video: true,
//       messaging: 'unlimited',
//       stealth: true,
//       spotlightDays: 3,
//       pauseAllowed: true,
//       verification: 'gold',
//       boosts: 5,
//       spotlight: 3,
//       icebreakersPerMonth: 30,
//       parentIcebreakers: 30,
//       filters: ['age', 'religion', 'district', 'education', 'profession', 'lifestyle', 'income', 'family'],
//     },
//   },
//   {
//     code: 'OBHIJAAT',
//     name: 'Obhijaat',
//     price: 9999,
//     durationDays: 30,
//     isInviteOnly: true,
//     features: {
//       photos: 12,
//       video: true,
//       messaging: 'unlimited',
//       signatureFeed: true,
//       founderConsult: true,
//       aiIntroductions: 3,
//       familyMessaging: true,
//       stealth: true,
//       pauseAllowed: true,
//       verification: 'gold',
//       boosts: 10,
//       spotlight: 5,
//       spotlightDays: 7,
//       icebreakersPerMonth: 100,
//       parentIcebreakers: 100,
//       filters: ['age', 'religion', 'district', 'education', 'profession', 'lifestyle', 'income', 'family', 'premium'],
//     },
//   },
// ];

const plans: PlanSeed[] = [
  {
    code: 'ALAAP',
    name: 'Alaap',
    price: 999,
    durationDays: 30,
    isInviteOnly: false,
    category: 'subscription',
    features: {
      photos: 3,
      video: false,
      messaging: false, // Only icebreakers allowed
      icebreakersPerMonth: 5,
      parentIcebreakers: 5,
      filters: ['age', 'religion', 'country'],
      verification: 'selfie',
      stealth: false,
      boosts: 0,
      spotlight: 0,
      spotlightDays: 0,
      aiIntroductions: 0,
      familyMessaging: false,
      signatureFeed: false,
      pauseAllowed: false,
      videoCalling: false,
      voiceCalling: false, // Restricted to Aalok+
      tierVisibility: ['ALAAP', 'JATRA'], // Can view Alaap and Jatra profiles
    },
  },
  {
    code: 'JATRA',
    name: 'Jatra',
    price: 2999,
    durationDays: 30,
    isInviteOnly: false,
    category: 'subscription',
    features: {
      photos: 6,
      video: false,
      messaging: {
        newChatsPerMonth: 5,
        messagesPerChat: 10,
      },
      boosts: 1,
      spotlight: 1,
      spotlightDays: 1,
      filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent'],
      verification: 'selfie',
      stealth: false,
      icebreakersPerMonth: 0, // Uses direct messaging now
      parentIcebreakers: 0,
      aiIntroductions: 0,
      familyMessaging: true, // Parents can send messages
      signatureFeed: false,
      pauseAllowed: false,
      videoCalling: false,
      voiceCalling: false, // Restricted to Aalok+
      tierVisibility: ['ALAAP', 'JATRA'], // Can view Alaap, Jatra, and request Aalok
      canRequestAalok: true,
    },
  },
  {
    code: 'AALOK',
    name: 'Aalok',
    price: 5999,
    durationDays: 30,
    isInviteOnly: false,
    category: 'subscription',
    features: {
      photos: 9,
      video: true,
      messaging: 'unlimited',
      stealth: true,
      spotlightDays: 3,
      pauseAllowed: true,
      verification: 'selfie',
      boosts: 5,
      spotlight: 3,
      icebreakersPerMonth: 0, // Unlimited messaging
      parentIcebreakers: 0,
      filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent', 'income', 'family'],
      aiIntroductions: 3,
      familyMessaging: true,
      signatureFeed: false,
      founderConsult: false,
      videoCalling: true,
      voiceCalling: true,
      tierVisibility: ['ALAAP', 'JATRA', 'AALOK'], // Can view all lower tiers
      visibilityControl: true, // Can choose if visible to Jatra or all verified
    },
  },
  {
    code: 'OBHIJAAT',
    name: 'Obhijaat',
    price: 14999,
    durationDays: 30,
    isInviteOnly: true,
    category: 'subscription',
    features: {
      // Profile & Media
      photos: 12,
      video: true, // 45-second intro video
      videoIntroSeconds: 45,
      messaging: 'unlimited',
      signatureFeed: true, // Private circle access
      founderConsult: true, // Founder consultation
      aiIntroductions: 5,
      familyMessaging: true, // Family concierge
      stealth: true, // Invisible by default
      pauseAllowed: true,
      verification: 'gold',
      boosts: 10,
      spotlight: 5,
      spotlightDays: 7,
      icebreakersPerMonth: 0,
      parentIcebreakers: 0,
      filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent', 'income', 'family', 'premium'],
      videoCalling: true, // In-app video calling
      voiceCalling: true,
      signatureBadge: true, // Gold marker
      tierVisibility: ['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'], // Can view everyone
      visibilityControl: true, // Invisible by default, approve individually
      founderEvents: true, // Invitations to curated gatherings
    },
  },
];

// , vendor, feature, etc.

export async function seedPlans(): Promise<void> {
  console.log('Seeding plans...');

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        isInviteOnly: plan.isInviteOnly,
        category: plan.category,
        features: plan.features as any,
      },
      create: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        isInviteOnly: plan.isInviteOnly,
        category: plan.category,
        features: plan.features as any,
      },
    });

    console.log(`  - ${plan.code} plan seeded`);
  }

  console.log('Plans seeded successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPlans()
    .catch((e) => {
      console.error('Error seeding plans:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
