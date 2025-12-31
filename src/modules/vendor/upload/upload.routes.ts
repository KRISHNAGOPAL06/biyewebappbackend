import { Router } from 'express';
import { upload } from './upload.service.js';
import { uploadController } from './upload.controller.js';
import { authenticateVendor } from '../middleware/vendor-auth.middleware.js';
import express from 'express';
import path from 'path';

const router = Router();

// Serve uploaded files statically with CORS headers
const UPLOAD_DIR = path.join(process.cwd(), 'src', 'modules', 'vendor', 'upload', 'files');
router.use('/files', express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

// Upload single image (for logo, cover image)
router.post(
    '/single',
    authenticateVendor,
    upload.single('image'),
    uploadController.uploadSingle.bind(uploadController)
);

// Upload multiple images (for gallery)
router.post(
    '/multiple',
    authenticateVendor,
    upload.array('images', 10), // Max 10 images at once
    uploadController.uploadMultiple.bind(uploadController)
);

export default router;
