import { z } from "zod";

export const PagePropertiesSchema = z
  .record(z.string(), z.unknown())
  .describe(
    `Page properties object. Keys are property names, values depend on type:
- title: { type: "title", title: [{ text: { content: "Page Title" } }] }
- rich_text: { type: "rich_text", rich_text: [{ text: { content: "Text" } }] }
- number: { type: "number", number: 42 }
- checkbox: { type: "checkbox", checkbox: true }
- select: { type: "select", select: { name: "Option" } }
- multi_select: { type: "multi_select", multi_select: [{ name: "Tag1" }, { name: "Tag2" }] }
- date: { type: "date", date: { start: "2024-01-15", end?: "2024-01-16" } }
- url: { type: "url", url: "https://example.com" }
- email: { type: "email", email: "user@example.com" }
- phone_number: { type: "phone_number", phone_number: "+86 138-0013-8000" }
- people: { type: "people", people: [{ id: "user-uuid" }] }
- files: { type: "files", files: [{ name: "doc.pdf", external: { url: "https://..." } }] }
- relation: { type: "relation", relation: [{ id: "page-uuid" }] }`,
  );

export const DatabasePropertiesSchema = z
  .record(z.string(), z.unknown())
  .describe(
    `Database property schema definitions. Keys are property IDs, values define the schema:
- title: { id: "title", name: "Name", type: "title" }
- rich_text: { id: "desc", name: "Description", type: "rich_text" }
- number: { id: "amt", name: "Amount", type: "number", number: { format: "number" } }
- checkbox: { id: "done", name: "Done", type: "checkbox" }
- select: { id: "status", name: "Status", type: "select", select: { options: [{ name: "Active", color: "green" }] } }
- multi_select: { id: "tags", name: "Tags", type: "multi_select", multi_select: { options: [{ name: "Tag", color: "blue" }] } }
- date: { id: "due", name: "Due Date", type: "date" }
- url/email/phone_number: { id: "...", name: "...", type: "url"|"email"|"phone_number" }
- people: { id: "owner", name: "Owner", type: "people" }
- files: { id: "att", name: "Attachments", type: "files" }
- relation: { id: "rel", name: "Related", type: "relation", relation: { database_id: "target-db-uuid" } }
Set a property to null to delete it.`,
  );
