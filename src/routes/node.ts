import express from 'express';
import controller from '../controllers/node';

const router = express.Router();

router.get('/get/:file/:node', controller.getNode);
router.post('/push/:file/:node', controller.pushNode);
router.delete('/delete/:file/:node', controller.deleteNode);

export default router;