import { Router, Request, Response } from 'express';
import { isDbConnected } from '../config/database';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'CraveKart REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? 'connected' : 'ready (hybrid store active)',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

export default router;
