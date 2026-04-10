import { z } from "zod";

export {
  ApiPagePropertiesSchema,
  ApiTitlePropertySchema,
  ApiPagePropertiesSchema as PagePropertiesSchema,
} from "./api/properties.js";

export {
  InputPagePropertiesSchema,
  InputTitlePropertySchema,
} from "./input/properties.js";

export const DatabasePropertiesSchema = z
  .record(z.string(), z.unknown())
  .describe(
    `Database property schema definitions. Keys are property IDs. Each value MUST include "name" and "type" fields.

CORRECT format:
- title: { "id": "title", "name": "Name", "type": "title" }
- rich_text: { "id": "desc", "name": "Description", "type": "rich_text" }
- number: { "id": "amt", "name": "Amount", "type": "number", "number": { "format": "number" } }
- checkbox: { "id": "done", "name": "Done", "type": "checkbox" }
- select: { "id": "status", "name": "Status", "type": "select", "select": { "options": [{ "name": "Active", "color": "green" }] } }
- multi_select: { "id": "tags", "name": "Tags", "type": "multi_select", "multi_select": { "options": [{ "name": "Tag", "color": "blue" }] } }
- date: { "id": "due", "name": "Due Date", "type": "date" }
- url/email/phone_number: { "id": "...", "name": "...", "type": "url"|"email"|"phone_number" }
- people: { "id": "owner", "name": "Owner", "type": "people" }
- files: { "id": "att", "name": "Attachments", "type": "files" }
- relation: { "id": "rel", "name": "Related", "type": "relation", "relation": { "database_id": "target-db-uuid" } }
Set a property to null to delete it.`,
  );
