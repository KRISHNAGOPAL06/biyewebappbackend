import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../utils/response.js';
import { uploadService } from './upload.service.js';

class UploadController {
    /**
     * Upload single image
     */
    uploadSingle(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'No file uploaded' }
                });
            }

            const fileUrl = uploadService.getFileUrl(req.file.filename);

            return sendSuccess(res, {
                filename: req.file.filename,
                url: fileUrl,
                size: req.file.size,
                mimetype: req.file.mimetype
            }, 'File uploaded successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload multiple images
     */
    uploadMultiple(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'No files uploaded' }
                });
            }

            const files = req.files.map(file => ({
                filename: file.filename,
                url: uploadService.getFileUrl(file.filename),
                size: file.size,
                mimetype: file.mimetype
            }));

            return sendSuccess(res, {
                files,
                count: files.length
            }, `${files.length} file(s) uploaded successfully`, 200);
        } catch (error) {
            next(error);
        }
    }
}

export const uploadController = new UploadController();
