/**
 * Built-in MCP Tools Index
 *
 * Exports all built-in tools and provides registration utility.
 */

import { databaseQueryTool } from "./database_query";
import { sendEmailTool } from "./send_email";
import { webSearchTool } from "./web_search";
import { calculateTool } from "./calculate";
import { MCPToolRegistry } from "../MCPToolRegistry";
import type { MCPTool } from "../types";

// Export individual tools
export { databaseQueryTool } from "./database_query";
export { sendEmailTool } from "./send_email";
export { webSearchTool } from "./web_search";
export { calculateTool } from "./calculate";

// All built-in tools
export const builtinTools: MCPTool[] = [
  databaseQueryTool,
  sendEmailTool,
  webSearchTool,
  calculateTool,
];

/**
 * Register all built-in tools with the registry
 */
export function registerBuiltinTools(registry?: MCPToolRegistry): void {
  const reg = registry || MCPToolRegistry.getInstance();

  for (const tool of builtinTools) {
    if (!reg.has(tool.name)) {
      reg.register(tool);
    }
  }
}

/**
 * Get the list of built-in tool names
 */
export function getBuiltinToolNames(): string[] {
  return builtinTools.map((t) => t.name);
}
