import { Request, Response, NextFunction } from "express";
import { Client } from "@notionhq/client";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

const getTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notion = new Client({
            auth: req.header("notion_token")
        });
        const response = await notion.databases.retrieve({ database_id: req.header("notion_database") });

        const result = {}
        for (let propertiesKey in response.properties) {

        }
        if (response.properties) {
            for (let key in response.properties) {
                if (response.properties[key].type === 'multi_select') {
                    result[key] = response.properties[key]['multi_select'].options
                }
            }
        }
        return res.status(200).json({
            code: 200,
            result: result
        });
    } catch (e) {
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

export default { getTags };