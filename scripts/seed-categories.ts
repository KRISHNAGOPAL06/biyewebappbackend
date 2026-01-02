// Seed script for vendor service categories
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    { name: 'Photography', slug: 'photography', description: 'Wedding and event photography services', icon: '📷', sortOrder: 1 },
    { name: 'Videography', slug: 'videography', description: 'Professional video recording and editing', icon: '🎬', sortOrder: 2 },
    { name: 'Venue', slug: 'venue', description: 'Wedding and event venues', icon: '🏛️', sortOrder: 3 },
    { name: 'Catering', slug: 'catering', description: 'Food and beverage services', icon: '🍽️', sortOrder: 4 },
    { name: 'Decoration', slug: 'decoration', description: 'Event decoration and styling', icon: '💐', sortOrder: 5 },
    { name: 'Music & DJ', slug: 'music-dj', description: 'Live music, DJs, and entertainment', icon: '🎵', sortOrder: 6 },
    { name: 'Makeup & Hair', slug: 'makeup-hair', description: 'Bridal makeup and hairstyling', icon: '💄', sortOrder: 7 },
    { name: 'Mehendi', slug: 'mehendi', description: 'Traditional henna art services', icon: '✋', sortOrder: 8 },
    { name: 'Jewelry', slug: 'jewelry', description: 'Bridal and wedding jewelry', icon: '💎', sortOrder: 9 },
    { name: 'Attire & Fashion', slug: 'attire-fashion', description: 'Wedding dresses and suits', icon: '👗', sortOrder: 10 },
    { name: 'Invitation & Stationery', slug: 'invitation-stationery', description: 'Wedding cards and print materials', icon: '💌', sortOrder: 11 },
    { name: 'Planning & Coordination', slug: 'planning-coordination', description: 'Wedding planning services', icon: '📋', sortOrder: 12 },
    { name: 'Transportation', slug: 'transportation', description: 'Wedding cars and transport', icon: '🚗', sortOrder: 13 },
    { name: 'Gifts & Favors', slug: 'gifts-favors', description: 'Wedding gifts and party favors', icon: '🎁', sortOrder: 14 },
    { name: 'Florist', slug: 'florist', description: 'Wedding flowers and bouquets', icon: '🌸', sortOrder: 15 },
    { name: 'Other', slug: 'other', description: 'Other wedding services', icon: '✨', sortOrder: 99 },
];

async function seedCategories() {
    console.log('Seeding vendor categories...');

    for (const category of categories) {
        const existing = await prisma.serviceCategory.findUnique({
            where: { slug: category.slug },
        });

        if (!existing) {
            await prisma.serviceCategory.create({
                data: {
                    name: category.name,
                    slug: category.slug,
                    description: category.description,
                    icon: category.icon,
                    sortOrder: category.sortOrder,
                    isActive: true,
                },
            });
            console.log(`✅ Created category: ${category.name}`);
        } else {
            console.log(`⏭️ Category already exists: ${category.name}`);
        }
    }

    console.log('Done seeding categories!');
}

seedCategories()
    .catch((e) => {
        console.error('Error seeding categories:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
