import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleClient } from "../googleClient.js";

/** Registers curated tools for the common Google services, plus a generic passthrough. */
export function registerGoogleTools(server: McpServer, google: GoogleClient): void {
  // --- Identity ---------------------------------------------------------
  server.registerTool(
    "google_whoami",
    {
      title: "Get authorized Google account",
      description: "Fetch basic profile info for the Google account this server is authorized as.",
      inputSchema: {},
    },
    async () => {
      const res = await google.people.people.get({
        resourceName: "people/me",
        personFields: "names,emailAddresses,photos",
      });
      return textResult(res.data);
    },
  );

  // --- Gmail --------------------------------------------------------------
  server.registerTool(
    "gmail_list_messages",
    {
      title: "List Gmail messages",
      description: "List/search Gmail messages using Gmail search syntax (e.g. \"from:alice is:unread\").",
      inputSchema: {
        query: z.string().optional().describe("Gmail search query"),
        maxResults: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      const res = await google.gmail.users.messages.list({
        userId: "me",
        q: args.query,
        maxResults: args.maxResults ?? 10,
      });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "gmail_get_message",
    {
      title: "Get Gmail message",
      description: "Fetch a single Gmail message by id.",
      inputSchema: { messageId: z.string() },
    },
    async (args) => {
      const res = await google.gmail.users.messages.get({ userId: "me", id: args.messageId, format: "full" });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "gmail_send_message",
    {
      title: "Send a Gmail message",
      description: "Send an email from the authorized account. `raw` must be an RFC 2822 message, base64url-encoded.",
      inputSchema: { raw: z.string().describe("Base64url-encoded RFC 2822 email") },
    },
    async (args) => {
      const res = await google.gmail.users.messages.send({ userId: "me", requestBody: { raw: args.raw } });
      return textResult(res.data);
    },
  );

  // --- Calendar -------------------------------------------------------------
  server.registerTool(
    "calendar_list_events",
    {
      title: "List calendar events",
      description: "List upcoming events on a calendar (default: primary).",
      inputSchema: {
        calendarId: z.string().optional(),
        timeMin: z.string().datetime().optional(),
        timeMax: z.string().datetime().optional(),
        maxResults: z.number().int().min(1).max(250).optional(),
      },
    },
    async (args) => {
      const res = await google.calendar.events.list({
        calendarId: args.calendarId ?? "primary",
        timeMin: args.timeMin ?? new Date().toISOString(),
        timeMax: args.timeMax,
        maxResults: args.maxResults ?? 20,
        singleEvents: true,
        orderBy: "startTime",
      });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "calendar_create_event",
    {
      title: "Create calendar event",
      description: "Create an event on a calendar (default: primary).",
      inputSchema: {
        calendarId: z.string().optional(),
        summary: z.string(),
        description: z.string().optional(),
        start: z.string().datetime().describe("ISO 8601 start time"),
        end: z.string().datetime().describe("ISO 8601 end time"),
        attendeeEmails: z.array(z.string().email()).optional(),
      },
    },
    async (args) => {
      const res = await google.calendar.events.insert({
        calendarId: args.calendarId ?? "primary",
        requestBody: {
          summary: args.summary,
          description: args.description,
          start: { dateTime: args.start },
          end: { dateTime: args.end },
          attendees: args.attendeeEmails?.map((email) => ({ email })),
        },
      });
      return textResult(res.data);
    },
  );

  // --- Drive --------------------------------------------------------------
  server.registerTool(
    "drive_search_files",
    {
      title: "Search Drive files",
      description: "Search Google Drive files/folders using Drive query syntax.",
      inputSchema: {
        query: z.string().optional().describe("Drive query, e.g. \"name contains 'report'\""),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      const res = await google.drive.files.list({
        q: args.query,
        pageSize: args.pageSize ?? 20,
        fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
      });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "drive_get_file_metadata",
    {
      title: "Get Drive file metadata",
      description: "Fetch metadata for a Drive file by id.",
      inputSchema: { fileId: z.string() },
    },
    async (args) => {
      const res = await google.drive.files.get({
        fileId: args.fileId,
        fields: "id,name,mimeType,modifiedTime,size,webViewLink,parents",
      });
      return textResult(res.data);
    },
  );

  // --- Sheets ---------------------------------------------------------------
  server.registerTool(
    "sheets_get_values",
    {
      title: "Read spreadsheet values",
      description: "Read a range of cell values from a Google Sheet.",
      inputSchema: {
        spreadsheetId: z.string(),
        range: z.string().describe("A1 notation range, e.g. \"Sheet1!A1:D20\""),
      },
    },
    async (args) => {
      const res = await google.sheets.spreadsheets.values.get({
        spreadsheetId: args.spreadsheetId,
        range: args.range,
      });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "sheets_update_values",
    {
      title: "Write spreadsheet values",
      description: "Write cell values into a range of a Google Sheet.",
      inputSchema: {
        spreadsheetId: z.string(),
        range: z.string().describe("A1 notation range, e.g. \"Sheet1!A1:D20\""),
        values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
      },
    },
    async (args) => {
      const res = await google.sheets.spreadsheets.values.update({
        spreadsheetId: args.spreadsheetId,
        range: args.range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: args.values },
      });
      return textResult(res.data);
    },
  );

  // --- Docs -----------------------------------------------------------------
  server.registerTool(
    "docs_get_document",
    {
      title: "Get Google Doc",
      description: "Fetch the structured content of a Google Doc by id.",
      inputSchema: { documentId: z.string() },
    },
    async (args) => {
      const res = await google.docs.documents.get({ documentId: args.documentId });
      return textResult(res.data);
    },
  );

  // --- Tasks -----------------------------------------------------------------
  server.registerTool(
    "tasks_list",
    {
      title: "List Google Tasks",
      description: "List tasks in a task list (default: default list).",
      inputSchema: { taskListId: z.string().optional() },
    },
    async (args) => {
      const res = await google.tasks.tasks.list({ tasklist: args.taskListId ?? "@default" });
      return textResult(res.data);
    },
  );

  server.registerTool(
    "tasks_create",
    {
      title: "Create Google Task",
      description: "Create a task in a task list (default: default list).",
      inputSchema: {
        taskListId: z.string().optional(),
        title: z.string(),
        notes: z.string().optional(),
        due: z.string().datetime().optional(),
      },
    },
    async (args) => {
      const res = await google.tasks.tasks.insert({
        tasklist: args.taskListId ?? "@default",
        requestBody: { title: args.title, notes: args.notes, due: args.due },
      });
      return textResult(res.data);
    },
  );

  // --- Generic passthrough ----------------------------------------------
  server.registerTool(
    "google_api_request",
    {
      title: "Raw Google API request",
      description:
        "Escape hatch for any Google REST API covered by the granted OAuth scopes that doesn't have a " +
        "dedicated tool above. `path` is relative to https://www.googleapis.com unless it's an absolute URL.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().describe("e.g. \"/photoslibrary/v1/albums\" or a full https:// URL"),
        params: z.record(z.string(), z.unknown()).optional().describe("Query parameters"),
        body: z.unknown().optional().describe("JSON request body, for POST/PUT/PATCH"),
      },
    },
    async (args) => {
      const data = await google.request({
        method: args.method,
        path: args.path,
        params: args.params,
        body: args.body,
      });
      return textResult(data);
    },
  );
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}
