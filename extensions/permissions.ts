import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface PermissionsConfig {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
}

interface ParsedRule {
  tool: string;
  pattern: RegExp;
  original: string;
}

function globToRegex(glob: string): RegExp {
  // Escape regex special chars except *, then convert * to .*
  const escaped = glob
    .replace(/([.+?^${}()|[\]\\])/g, "\\$1")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function parseRule(rule: string): ParsedRule | null {
  // Format: ToolName(pattern) e.g. Bash(git add *), Write(*.env), Edit(secrets/*)
  const match = rule.match(/^(\w+)\((.+)\)$/);
  if (!match) return null;
  const [, tool, glob] = match;
  return {
    tool: tool.toLowerCase(),
    pattern: globToRegex(glob),
    original: rule,
  };
}

// Map pi tool names to permission tool names
function getToolKey(toolName: string): string {
  switch (toolName) {
    case "bash":
      return "bash";
    case "write":
      return "write";
    case "edit":
      return "edit";
    case "read":
      return "read";
    default:
      return toolName;
  }
}

// Extract the matchable string from tool input
function getMatchTarget(toolName: string, input: Record<string, unknown>): string | null {
  switch (toolName) {
    case "bash":
      return (input.command as string)?.trim() ?? null;
    case "write":
      return (input.path as string) ?? null;
    case "edit":
      return (input.path as string) ?? null;
    case "read":
      return (input.path as string) ?? null;
    default:
      return null;
  }
}

async function loadConfig(cwd: string): Promise<PermissionsConfig> {
  // Try project-local first, then global
  const paths = [
    join(cwd, ".pi", "permissions.json"),
  ];

  // Global home config
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home) {
    paths.push(join(home, ".pi", "agent", "permissions.json"));
  }

  for (const configPath of paths) {
    try {
      const content = await readFile(configPath, "utf-8");
      return JSON.parse(content) as PermissionsConfig;
    } catch {
      // File not found or invalid, try next
    }
  }
  return {};
}

export default function (pi: ExtensionAPI) {
  let allowRules: ParsedRule[] = [];
  let denyRules: ParsedRule[] = [];

  async function reloadRules(cwd: string) {
    const config = await loadConfig(cwd);
    allowRules = (config.permissions?.allow ?? []).map(parseRule).filter((r): r is ParsedRule => r !== null);
    denyRules = (config.permissions?.deny ?? []).map(parseRule).filter((r): r is ParsedRule => r !== null);
  }

  // Load config on session start
  pi.on("session_start", async (_event, ctx) => {
    await reloadRules(ctx.cwd);
    const total = allowRules.length + denyRules.length;
    if (total > 0) {
      ctx.ui.notify(`Permissions loaded: ${allowRules.length} allow, ${denyRules.length} deny rules`, "info");
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    const toolKey = getToolKey(event.toolName);
    const target = getMatchTarget(event.toolName, event.input as Record<string, unknown>);
    if (!target) return;

    // Check deny rules first — deny always wins
    for (const rule of denyRules) {
      if (rule.tool === toolKey && rule.pattern.test(target)) {
        return {
          block: true,
          reason: `Blocked by deny rule: ${rule.original}\nCommand: ${target}`,
        };
      }
    }

    // If there are allow rules for this tool, the command must match at least one
    const toolAllowRules = allowRules.filter((r) => r.tool === toolKey);
    if (toolAllowRules.length > 0) {
      const allowed = toolAllowRules.some((rule) => rule.pattern.test(target));
      if (!allowed) {
        return {
          block: true,
          reason: `Blocked: no allow rule matched for ${event.toolName}.\nCommand: ${target}\nAllowed patterns: ${toolAllowRules.map((r) => r.original).join(", ")}`,
        };
      }
    }
  });
}
