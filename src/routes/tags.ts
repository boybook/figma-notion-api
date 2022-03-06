import express from 'express';
import controller from '../controllers/tags';

const router = express.Router();

router.use((req, res, next) => {
    if (!req.header("figma_token") || !req.header("notion_token") || !req.header("notion_database")) {
        return res.status(400).json({
            object: 'error',
            status: 400,
            code: 'bad request',
            message: 'Head missing (figma_token, notion_token, notion_database)',
            header: req.headers
        });
    }
    next();
});

router.get('/', controller.getTags);

export default router;