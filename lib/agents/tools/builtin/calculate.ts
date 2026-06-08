/**
 * Built-in MCP Tool: Calculate
 *
 * Mathematical and financial calculations.
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from "../types";

export const calculateTool: MCPTool = {
  name: "calculate",
  description:
    "Perform mathematical calculations including basic arithmetic, percentages, and financial formulas.",
  category: "calculation",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "add",
          "subtract",
          "multiply",
          "divide",
          "percentage",
          "compound_interest",
          "roi",
          "margin",
          "expression",
        ],
        description: "Type of calculation to perform",
      },
      values: {
        type: "array",
        items: { type: "number" },
        description: "Numeric values for the calculation",
      },
      expression: {
        type: "string",
        description:
          "Mathematical expression to evaluate (for 'expression' operation)",
      },
      options: {
        type: "object",
        description: "Additional options for specific calculations",
      },
    },
    required: ["operation"],
  },
  annotations: {
    title: "Calculator",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },

  handler: async (
    input: unknown,
    _context: ToolExecutionContext,
  ): Promise<MCPToolResult> => {
    const params = input as {
      operation: string;
      values?: number[];
      expression?: string;
      options?: Record<string, unknown>;
    };

    try {
      let result: number | Record<string, number>;

      switch (params.operation) {
        case "add":
          result = (params.values || []).reduce((a, b) => a + b, 0);
          break;

        case "subtract":
          if (!params.values || params.values.length < 2) {
            throw new Error("Subtract requires at least 2 values");
          }
          result = params.values.reduce((a, b) => a - b);
          break;

        case "multiply":
          result = (params.values || []).reduce((a, b) => a * b, 1);
          break;

        case "divide":
          if (!params.values || params.values.length < 2) {
            throw new Error("Divide requires at least 2 values");
          }
          if (params.values.slice(1).some((v) => v === 0)) {
            throw new Error("Division by zero");
          }
          result = params.values.reduce((a, b) => a / b);
          break;

        case "percentage":
          if (!params.values || params.values.length < 2) {
            throw new Error("Percentage requires value and percentage");
          }
          result = (params.values[0] * params.values[1]) / 100;
          break;

        case "compound_interest": {
          // P(1 + r/n)^(nt)
          const principal = params.values?.[0] || 0;
          const rate = params.values?.[1] || 0;
          const periods = (params.options?.periods as number) || 12;
          const years = (params.options?.years as number) || 1;

          const futureValue =
            principal * Math.pow(1 + rate / 100 / periods, periods * years);
          result = {
            principal,
            futureValue: Math.round(futureValue * 100) / 100,
            interest: Math.round((futureValue - principal) * 100) / 100,
          };
          break;
        }

        case "roi": {
          // (Current - Original) / Original * 100
          if (!params.values || params.values.length < 2) {
            throw new Error("ROI requires original and current values");
          }
          const [original, current] = params.values;
          if (original === 0) throw new Error("Original value cannot be zero");
          result = ((current - original) / original) * 100;
          break;
        }

        case "margin": {
          // (Price - Cost) / Price * 100
          if (!params.values || params.values.length < 2) {
            throw new Error("Margin requires cost and price values");
          }
          const [cost, price] = params.values;
          if (price === 0) throw new Error("Price cannot be zero");
          result = ((price - cost) / price) * 100;
          break;
        }

        case "expression":
          if (!params.expression) {
            throw new Error("Expression is required");
          }
          // Safe expression evaluation (basic math only)
          result = evaluateSafeExpression(params.expression);
          break;

        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              operation: params.operation,
              result,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "error",
            code: "CALCULATION_ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Safely evaluate a mathematical expression
 */
function evaluateSafeExpression(expr: string): number {
  // Only allow numbers, operators, parentheses, and math functions
  const safePattern = /^[\d\s+\-*/().%^]+$/;

  if (!safePattern.test(expr)) {
    throw new Error("Invalid characters in expression");
  }

  // Replace ^ with ** for exponentiation
  const sanitized = expr.replace(/\^/g, "**");

  // Use Function constructor for sandboxed evaluation
  // This is safer than eval() as it doesn't have access to local scope
  try {
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const result = fn();

    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Expression did not evaluate to a valid number");
    }

    return result;
  } catch {
    throw new Error("Failed to evaluate expression");
  }
}

