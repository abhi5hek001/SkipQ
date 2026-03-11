import express from 'express';
import { sessionController } from '../controllers/session.controller.js';

const router = express.Router();

// POST /session/start -> Creates or fetches user based on name and role
router.post('/start', sessionController.startSession);

export default router;
