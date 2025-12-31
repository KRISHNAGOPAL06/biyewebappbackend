
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

async function main() {
    const photos = await prisma.photo.findMany({
        include: { profile: true }
    });

    console.log(`Checking ${photos.length} photos...`);

    for (const photo of photos) {
        if (!photo.objectKey) continue;

        const fullPath = path.resolve(UPLOADS_DIR, photo.objectKey);

        if (!fs.existsSync(fullPath)) {
            console.log(`[MISSING] ID: ${photo.id}, Key: ${photo.objectKey} - Deleting record...`);
            await prisma.photo.delete({ where: { id: photo.id } });
        } else {
            console.log(`[OK] ID: ${photo.id}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
