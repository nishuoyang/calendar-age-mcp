import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerCalendarTools } from "./tools/calendar.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerCalendarTools(server);
  return server;
}

