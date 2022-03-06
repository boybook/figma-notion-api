import { Request, Response, NextFunction } from "express";
import { Client } from "@notionhq/client";
import * as Figma from 'figma-api';

interface NotionNodeInfo {
    id: string,
    name: string,
    url: string,
    tags: {},
}

const getNode0 = async (notionToken: string, notionDatabase: string, file: string, node: string) : Promise<Array<NotionNodeInfo>> => {
    const notion = new Client({
        auth: notionToken
    });
    const url = 'https://www.figma.com/file/' + file + '/?node-id=' + encodeURIComponent(node);
    const response = await notion.databases.query({
        database_id: notionDatabase,
        filter: {
            property: 'URL',
            url: {
                equals: url,
            },
        },
    });
    const result: Array<NotionNodeInfo> = [];
    for (let e of response.results) {
        const tags = {};
        for (let key of Object.keys(e['properties'])) {
            const value = e['properties'][key];
            if (value.type === 'multi_select') {
                tags[key] = value.multi_select;
            }
        }

        result.push({
            id: e.id,
            name: e['properties']['Name']['title'].length > 0 ? e['properties']['Name']['title'][0]['plain_text'] : "",
            url: e['url'],
            tags: tags
        });
    }
    return result;
}

const getNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params['file'] || !req.params['node']) {
            return res.status(400).json({
                object: 'error',
                status: 400,
                code: 'bad request',
                message: 'Missing params (file, node)'
            });
        }
        const response = await getNode0(req.header("notion_token"), req.header("notion_database"), req.params['file'], req.params['node'])

        return res.status(200).json({
            code: 200,
            result: response
        });
    } catch (e) {
        console.error(e);
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

const pushNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params['file'] || !req.params['node']) {
            return res.status(400).json({
                object: 'error',
                status: 400,
                code: 'bad request',
                message: 'Missing params (file, node)'
            });
        }
        if (!req.body['name'] || !req.body['tags']) {
            return res.status(400).json({
                object: 'error',
                status: 400,
                code: 'bad request',
                message: 'Missing body (name, tags)'
            });
        }
        const nodes = await getNode0(req.header("notion_token"), req.header("notion_database"), req.params['file'], req.params['node']);
        const url = 'https://www.figma.com/file/' + req.params['file'] + '/?node-id=' + encodeURIComponent(req.params['node']);

        let cover: string;
        let coverMin: string;
        if (!req.body['cover']) {
            const figma = new Figma.Api({
                personalAccessToken: req.header("figma_token"),
            });

            const imageData = await figma.getImage(req.params['file'], {
                ids: req.params['node'],
                format: "png",
                scale: 1
            });
            cover = imageData.images[decodeURI(req.params['node'])];
            coverMin = cover + "?x-oss-process=style/min"
        } else {
            cover = req.body['cover'];
        }

        const notion = new Client({
            auth: req.header("notion_token")
        });

        const properties = {};

        Object.keys(req.body['tags']).forEach((tagType) => {
            properties[tagType] = {
                multi_select: []
            };
            for (let tag of req.body['tags'][tagType]) {
                properties[tagType].multi_select.push({
                    name: tag
                });
            }
            properties["Name"] = {
                title: [
                    {
                        type: "text",
                        text: {
                            content: req.body['name']
                        }
                    }
                ]
            }
        })

        const result = [];
        if (nodes.length > 0) {
            // Update
            for (let node of nodes) {
                result.push(await notion.pages.update({
                    page_id: node.id,
                    cover: {
                        type: "external",
                        external: {
                            url: coverMin
                        }
                    },
                    properties: properties
                }));
                const childList = await notion.blocks.children.list({
                    block_id: node.id,
                    page_size: 50,
                });
                for (let child of childList.results) {
                    if (child['type'] === 'embed') {
                        if (child['embed']['url'].startsWith("https://www.figma.com/embed")) {
                            await notion.blocks.update({
                                block_id: child.id,
                                embed: {
                                    url: 'https://www.figma.com/embed?embed_host=notion&url=' + encodeURIComponent(url)
                                }
                            });
                        } else if (child['embed']['url'].includes("figma-alpha-api")) {
                            await notion.blocks.update({
                                block_id: child.id,
                                embed: {
                                    url: cover
                                }
                            });
                        }
                    }
                }
            }
            return res.status(200).json({
                code: 200,
                result: result
            });
        } else {
            // Create
            properties['URL'] = {
                url: url
            }
            result.push(await notion.pages.create({
                parent: {
                    database_id: req.header("notion_database"),
                },
                cover: {
                    type: "external",
                    external: {
                        url: cover
                    }
                },
                properties: properties,
                children: [
                    {
                        type: "embed",
                        embed: {
                            url: cover
                        }
                    },
                    {
                        type: "embed",
                        embed: {
                            url: 'https://www.figma.com/embed?embed_host=notion&url=' + encodeURIComponent(url)
                        },
                    },
                    // {
                    //     type: "image",
                    //     image: {
                    //         type: "external",
                    //         external: {
                    //             url: imageData.images[decodeURI(req.params['node'])]
                    //         }
                    //     }
                    // }
                ]
            }));
            return res.status(200).json({
                code: 200,
                result: result
            });
        }
    } catch (e) {
        console.error(e);
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

const deleteNode = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params['file'] || !req.params['node']) {
        return res.status(400).json({
            object: 'error',
            status: 400,
            code: 'bad request',
            message: 'Missing params (file, node)'
        });
    }
    const notion = new Client({
        auth: req.header("notion_token")
    });
    try {
        const nodes = await getNode0(req.header("notion_token"), req.header("notion_database"), req.params['file'], req.params['node']);
        if (nodes.length > 0) {
            for (let node of nodes) {
                await notion.blocks.delete({
                    block_id: nodes[0].id
                });
            }
            return res.status(200).json({
                code: 200,
                message: 'Deleted ' + nodes.length + ' nodes.'
            });
        } else {
            return res.status(200).json({
                code: 200,
                message: 'Nothing to delete.'
            });
        }
    } catch (e) {
        console.error(e);
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

const patchAll = async (req: Request, res: Response, next: NextFunction) => {
    const notion = new Client({
        auth: req.header("notion_token")
    });
    try {
        const data = await notion.databases.query({
            database_id: req.header("notion_database"),
            page_size: 500
        });
        const figma = new Figma.Api({
            personalAccessToken: req.header("figma_token"),
        });
        for (let node of data.results) {
            const url: string = node['properties']['URL']['url'];
            console.log(url);
            if (url.startsWith("https://www.figma.com/file/") && url.concat("?node-id=")) {
                //https://www.figma.com/file/P8dD309i1hqxNv2pjxhiNi/?node-id=750%3A32391
                const file = url.slice(27, 27+22);
                const node = decodeURIComponent(url.slice(59, url.length));

                const nodeData = await figma.getFileNodes(file, [node]);

                let width = 0;
                for (let nodeKey in nodeData.nodes) {
                    if (nodeData.nodes[nodeKey].document['absoluteBoundingBox']) {
                        width = nodeData.nodes[nodeKey].document['absoluteBoundingBox'].width;
                        break;
                    }
                }
                const imageData = await figma.getImage(file, {
                    ids: node,
                    format: "png",
                    scale: width > 0 ? (640 / width) : 1
                });
                console.log(imageData);
            }
        }
        return res.status(200).json({
            code: 200,
            message: 'ok'
        });
    } catch (e) {
        console.error(e);
        return res.status(e.status ? e.status : 500).send(e.body);
    }
};

export default { getNode, pushNode, deleteNode, patchAll };