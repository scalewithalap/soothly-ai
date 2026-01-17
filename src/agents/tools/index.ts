/**
 * MCP Tools Module Index
 *
 * Central export for MCP tool functionality.
 */

// Types
export * from "./types";

// Registry
export { MCPToolRegistry, getToolRegistry } from "./MCPToolRegistry";

// Client
export { MCPClient, MCPClientManager, getMCPClientManager } from "./MCPClient";

// Built-in tools
export {
  builtinTools,
  registerBuiltinTools,
  getBuiltinToolNames,
  databaseQueryTool,
  sendEmailTool,
  webSearchTool,
  calculateTool,
} from "./builtin";
