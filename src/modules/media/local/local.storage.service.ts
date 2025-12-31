import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const localStorageService = {
    async createLocalUploadUrl(objectKey: string): Promise<{ url: string }> {
        const fullPath = path.join(UPLOADS_DIR, objectKey);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return { url: `/uploads/${objectKey.replace(/\\/g, '/')}` };
    },

    async saveFile(objectKey: string, buffer: Buffer): Promise<string> {
        const fullPath = path.join(UPLOADS_DIR, objectKey);
        await fs.promises.writeFile(fullPath, buffer);
        return `/uploads/${objectKey.replace(/\\/g, '/')}`;
    },

    async deleteFile(objectKey: string): Promise<void> {
        const fullPath = path.join(UPLOADS_DIR, objectKey);
        if (fs.existsSync(fullPath)) await fs.promises.unlink(fullPath);
    },
};
