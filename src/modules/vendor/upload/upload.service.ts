import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../../../utils/AppError.js';

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'src', 'modules', 'vendor', 'upload', 'files');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `vendor-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
    }
};

// Multer configuration
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: fileFilter
});

class UploadService {
    /**
     * Get file URL from filename
     */
    getFileUrl(filename: string): string {
        // Return relative URL without domain
        return `/api/v1/vendor/uploads/files/${filename}`;
    }

    /**
     * Delete file
     */
    deleteFile(filename: string): void {
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    /**
     * Get file path
     */
    getFilePath(filename: string): string {
        return path.join(UPLOAD_DIR, filename);
    }
}

export const uploadService = new UploadService();
