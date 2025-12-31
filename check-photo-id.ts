
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const photo = await prisma.photo.findUnique({
        where: { id: '6c74ca79-4797-47bb-a3b3-9ff9d35ce8ae' }
    });

    console.log('PHOTO_DEBUG:', JSON.stringify(photo));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
