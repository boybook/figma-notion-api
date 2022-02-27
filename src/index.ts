import http from 'http';
import express, { Express } from 'express';
import morgan from 'morgan';
import routesTags from './routes/tags';
import routesNode from './routes/node';

const router: Express = express();

/** Logging */
router.use(morgan('dev'));
/** Parse the request */
router.use(express.urlencoded({ extended: false }));
/** Takes care of JSON data */
router.use(express.json());

/** RULES OF OUR API */
router.use((req, res, next) => {
    // set the CORS policy
    res.header('Access-Control-Allow-Origin', '*');
    // set the CORS headers
    res.header('Access-Control-Allow-Headers', 'origin, X-Requested-With,Content-Type,Accept, Authorization');
    res.header('Content-Type', 'application/json');

    if (!req.header("figma_token") || !req.header("notion_token") || !req.header("notion_database")) {
        return res.status(400).json({
            object: 'error',
            status: 400,
            code: 'bad request',
            message: 'Head missing (figma_token, notion_token, notion_database)'
        });
    }
    // set the CORS method headers
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET PATCH DELETE POST');
        return res.status(200).json({});
    }
    next();
});

/** Routes */
router.use('/tags', routesTags);
router.use('/node', routesNode);

/** Error handling */
router.use((req, res, next) => {
    const error = new Error('not found');
    return res.status(404).json({
        message: error.message
    });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: any = process.env.PORT ?? 6060;
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));