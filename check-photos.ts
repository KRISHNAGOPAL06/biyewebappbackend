
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const photos = await prisma.photo.findMany({
        take: 5
    });

    photos.forEach(p => {
        console.log(`ID: ${p.id} | KEY: ${p.objectKey} | URL: ${p.url}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
