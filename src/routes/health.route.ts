import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

const router = Router();

const startTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  sendSuccess(res, {
    status: 'ok',
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
