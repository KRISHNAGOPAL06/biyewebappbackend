
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const photo = await prisma.photo.findUnique({
        where: { id: '6c74ca79-4797-47bb-a3b3-9ff9d35ce8ae' }
    });

    if (photo) {
        fs.writeFileSync('photo-key.txt', `KEY: ${photo.objectKey}\nID: ${photo.id}`);
        console.log("Written to photo-key.txt");
    } else {
        console.log("Photo not found");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
