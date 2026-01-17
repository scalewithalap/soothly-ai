/**
 * MCP Tool Registry
 *
 * Central registry for managing MCP-compliant tools.
 * Provides registration, discovery, validation, and execution.
 */

import Ajv from "ajv";
import {
  type MCPTool,
  type MCPToolResult,
  type MCPRegistryConfig,
  type ToolExecutionRequest,
  type ToolExecutionResponse,
  type JSONSchema,
  MCPErrorCodes,
} from "./types";

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true, strict: false });

export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private config: MCPRegistryConfig;
  private static instance: MCPToolRegistry | null = null;

  private constructor(config: MCPRegistryConfig = {}) {
    this.config = {
      maxConcurrency: 10,
      defaultTimeoutMs: 30000,
      validateInput: true,
      validateOutput: false,
      ...config,
    };
  }

  /**
   * Get singleton instance of the registry
   */
  static getInstance(config?: MCPRegistryConfig): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry(config);
    }
    return MCPToolRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    MCPToolRegistry.instance = null;
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }

    // Validate the input schema structure
    if (tool.inputSchema.type !== "object") {
      throw new Error(
        `Tool "${tool.name}" inputSchema must have type "object"`,
      );
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: string): MCPTool[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool
   */
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    const { toolName, input, context, timeout } = request;
    const startTime = Date.now();

    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        toolName,
        executionTime: Date.now() - startTime,
        result: this.createErrorResult(
          MCPErrorCodes.TOOL_NOT_FOUND,
          `Tool "${toolName}" not found`,
        ),
      };
    }

    // Check permissions
    if (tool.requiredPermissions?.length) {
      // TODO: Implement permission checking with context
    }

    // Validate input
    if (this.config.validateInput) {
      const validationError = this.validateInput(tool.inputSchema, input);
      if (validationError) {
        return {
          toolName,
          executionTime: Date.now() - startTime,
          result: this.createErrorResult(
            MCPErrorCodes.INVALID_INPUT,
            validationError,
          ),
        };
      }
    }

    // Execute with timeout
    const effectiveTimeout = timeout ?? this.config.defaultTimeoutMs ?? 30000;

    try {
      const result = await this.executeWithTimeout(
        tool.handler(input, context),
        effectiveTimeout,
      );

      // Call execution hook if configured
      if (this.config.onToolExecute) {
        this.config.onToolExecute(tool, input, result);
      }

      return {
        toolName,
        executionTime: Date.now() - startTime,
        result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes("timeout");

      return {
        toolName,
        executionTime: Date.now() - startTime,
        result: this.createErrorResult(
          isTimeout ? MCPErrorCodes.TIMEOUT : MCPErrorCodes.EXECUTION_FAILED,
          errorMessage,
        ),
      };
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeMany(
    requests: ToolExecutionRequest[],
  ): Promise<ToolExecutionResponse[]> {
    const maxConcurrency = this.config.maxConcurrency ?? 10;

    // Execute in batches respecting concurrency limit
    const results: ToolExecutionResponse[] = [];

    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map((req) => this.execute(req)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get tool definitions for LLM function calling
   */
  getToolDefinitions(): Array<{
    name: string;
    description: string;
    parameters: JSONSchema;
  }> {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  /**
   * Validate input against schema
   */
  private validateInput(schema: JSONSchema, input: unknown): string | null {
    const validate = ajv.compile(schema);
    const valid = validate(input);

    if (!valid && validate.errors) {
      const messages = validate.errors.map(
        (e) => `${e.instancePath || "input"} ${e.message}`,
      );
      return messages.join("; ");
    }

    return null;
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Create an error result
   */
  private createErrorResult(code: string, message: string): MCPToolResult {
    return {
      content: [
        {
          type: "error",
          code,
          message,
        },
      ],
      isError: true,
    };
  }
}

// Export singleton getter for convenience
export const getToolRegistry = MCPToolRegistry.getInstance;
