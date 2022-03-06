import { Request, Response, NextFunction } from "express";
import { Client } from "@notionhq/client";

const query = async (req: Request, res: Response, next: NextFunction) => {
    const notion = new Client({
        auth: req.header("notion_token")
    });
    try {
        const data = await notion.databases.query({
            database_id: req.params['database'],
            filter: req.body['filter'],
            sorts: req.body['sorts'],
            start_cursor: req.body['start_cursor'],
            page_size: req.body['page_size']
        });
        return res.status(200).json(data);
    } catch (e) {
        console.error(e);
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

export default {query};