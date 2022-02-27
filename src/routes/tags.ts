import express from 'express';
import controller from '../controllers/tags';

const router = express.Router();

router.get('/', controller.getTags);

export default router;