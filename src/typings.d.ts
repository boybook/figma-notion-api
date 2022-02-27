declare namespace API {

    type RequestHead = {
        figma_token: string,
        notion_token: string,
        notion_database: string,
    };

    type ResponseTags = {
        result: Map<string, [string]>
    }

}