import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PermissionsConfig } from "./rules.ts";
import { evaluate, parseRules } from "./rules.ts";
import type { ParsedRule } from "./rules.ts";

async function loadConfig(cwd: string): Promise<PermissionsConfig> {
  const paths = [join(cwd, ".pi", "permissions.json")];

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
    allowRules = parseRules(config.permissions?.allow ?? []);
    denyRules = parseRules(config.permissions?.deny ?? []);
  }

  pi.on("session_start", async (_event, ctx) => {
    await reloadRules(ctx.cwd);
    const total = allowRules.length + denyRules.length;
    if (total > 0) {
      ctx.ui.notify(
        `Permissions loaded: ${allowRules.length} allow, ${denyRules.length} deny rules`,
        "info",
      );
    }
  });

  pi.on("tool_call", async (event) => {
    const result = evaluate(
      event.toolName,
      event.input as Record<string, unknown>,
      allowRules,
      denyRules,
    );
    if (result.blocked) {
      return { block: true, reason: result.reason! };
    }
  });
}
