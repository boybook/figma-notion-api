import express from 'express';
import controller from '../controllers/database';

const router = express.Router();

router.use((req, res, next) => {
    if (!req.header("notion_token")) {
        return res.status(400).json({
            object: 'error',
            status: 400,
            code: 'bad request',
            message: 'Head missing (notion_token)',
            header: req.headers
        });
    }
    next();
});

router.post('/:database/query', controller.query);

export default router;