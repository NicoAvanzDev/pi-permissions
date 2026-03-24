import { describe, expect, it } from "vitest";
import { evaluate, parseRules } from "../rules.ts";

describe("evaluate", () => {
  describe("deny rules", () => {
    it("blocks matching deny rule", () => {
      const deny = parseRules(["Bash(git push *)"]);
      const result = evaluate("bash", { command: "git push origin main" }, [], deny);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("deny rule");
    });

    it("allows non-matching deny rule", () => {
      const deny = parseRules(["Bash(git push *)"]);
      const result = evaluate("bash", { command: "git status" }, [], deny);
      expect(result.blocked).toBe(false);
    });

    it("deny wins over allow", () => {
      const allow = parseRules(["Bash(git *)"]);
      const deny = parseRules(["Bash(git push *)"]);
      const result = evaluate("bash", { command: "git push origin main" }, allow, deny);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("deny rule");
    });
  });

  describe("allow rules", () => {
    it("allows matching allow rule", () => {
      const allow = parseRules(["Bash(git status)"]);
      const result = evaluate("bash", { command: "git status" }, allow, []);
      expect(result.blocked).toBe(false);
    });

    it("blocks when no allow rule matches", () => {
      const allow = parseRules(["Bash(git status)", "Bash(git diff *)"]);
      const result = evaluate("bash", { command: "rm -rf /" }, allow, []);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("no allow rule matched");
    });

    it("allows when no allow rules exist for tool (open by default)", () => {
      const allow = parseRules(["Write(*.md)"]); // only write rules
      const result = evaluate("bash", { command: "rm -rf /" }, allow, []);
      expect(result.blocked).toBe(false); // no bash allow rules = open
    });
  });

  describe("file tools", () => {
    it("blocks write to denied path", () => {
      const deny = parseRules(["Write(*.env)"]);
      const result = evaluate("write", { path: ".env" }, [], deny);
      expect(result.blocked).toBe(true);
    });

    it("allows write to non-denied path", () => {
      const deny = parseRules(["Write(*.env)"]);
      const result = evaluate("write", { path: "README.md" }, [], deny);
      expect(result.blocked).toBe(false);
    });

    it("blocks edit when no allow rule matches", () => {
      const allow = parseRules(["Edit(src/*)"]);
      const result = evaluate("edit", { path: "secrets/key.pem" }, allow, []);
      expect(result.blocked).toBe(true);
    });

    it("allows edit when allow rule matches", () => {
      const allow = parseRules(["Edit(src/*)"]);
      const result = evaluate("edit", { path: "src/index.ts" }, allow, []);
      expect(result.blocked).toBe(false);
    });

    it("blocks read to denied path", () => {
      const deny = parseRules(["Read(*.pem)"]);
      const result = evaluate("read", { path: "secrets/key.pem" }, [], deny);
      expect(result.blocked).toBe(true);
    });
  });

  describe("no rules", () => {
    it("allows everything when no rules configured", () => {
      expect(evaluate("bash", { command: "rm -rf /" }, [], []).blocked).toBe(false);
      expect(evaluate("write", { path: ".env" }, [], []).blocked).toBe(false);
      expect(evaluate("edit", { path: "anything" }, [], []).blocked).toBe(false);
    });
  });

  describe("unknown tool / missing target", () => {
    it("allows unknown tool", () => {
      const deny = parseRules(["Bash(git push *)"]);
      const result = evaluate("unknown_tool", { foo: "bar" }, [], deny);
      expect(result.blocked).toBe(false);
    });

    it("allows when input has no matchable field", () => {
      const deny = parseRules(["Bash(git push *)"]);
      const result = evaluate("bash", {}, [], deny);
      expect(result.blocked).toBe(false);
    });
  });
});
