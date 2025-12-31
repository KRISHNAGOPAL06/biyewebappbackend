import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { mediaController } from './media.controller.js';
import { validate } from '../../middleware/validate.js';
import { CreateUploadUrlSchema } from './upload.dto.js';
import { authenticateToken, optionalAuthMiddleware } from '../../middleware/authMiddleware.js';
import { UpdatePhotoPrivacySchema } from './upload.dto.js';

const router = Router();
const upload = multer(); // memory storage

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many upload requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/upload-url',
  authenticateToken,
  uploadLimiter,
  validate(CreateUploadUrlSchema),
  mediaController.createUploadUrl.bind(mediaController)
);
// Actual file upload
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  mediaController.uploadFile.bind(mediaController)
);

router.get('/:photoId', optionalAuthMiddleware, mediaController.getPhotoById.bind(mediaController));

router.delete('/:photoId', authenticateToken, mediaController.deletePhoto.bind(mediaController));

router.get(
  '/profile/:profileId/photos',
  authenticateToken,
  mediaController.listProfilePhotos.bind(mediaController)
);

router.patch(
  '/privacy/:profileId',
  authenticateToken,
  validate(UpdatePhotoPrivacySchema),
  mediaController.updatePrivacyForProfile.bind(mediaController)
);


export default router;
