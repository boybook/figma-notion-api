import express from 'express';
import controller from '../controllers/database';

const router = express.Router();

router.post('/:database/query', controller.query);

export default router;