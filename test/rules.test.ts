import { describe, expect, it } from "vitest";
import { globToRegex, parseRule } from "../rules.ts";

describe("globToRegex", () => {
  it("matches exact string", () => {
    expect(globToRegex("git status").test("git status")).toBe(true);
    expect(globToRegex("git status").test("git status ")).toBe(false);
  });

  it("matches wildcard at end", () => {
    const re = globToRegex("git push *");
    expect(re.test("git push origin main")).toBe(true);
    expect(re.test("git push")).toBe(false);
  });

  it("matches wildcard at start", () => {
    const re = globToRegex("* --version");
    expect(re.test("node --version")).toBe(true);
    expect(re.test("npm --version")).toBe(true);
    expect(re.test("--version")).toBe(false); // no leading space
  });

  it("matches wildcard in middle", () => {
    const re = globToRegex("git * main");
    expect(re.test("git push main")).toBe(true);
    expect(re.test("git merge main")).toBe(true);
    expect(re.test("git push dev")).toBe(false);
  });

  it("escapes regex special characters", () => {
    const re = globToRegex("git add .");
    expect(re.test("git add .")).toBe(true);
    expect(re.test("git add X")).toBe(false); // . should not be regex any-char
  });

  it("handles multiple wildcards", () => {
    const re = globToRegex("* --help *");
    expect(re.test("node --help all")).toBe(true);
    expect(re.test("npm --help install")).toBe(true);
  });
});

describe("parseRule", () => {
  it("parses valid Bash rule", () => {
    const rule = parseRule("Bash(git push *)");
    expect(rule).not.toBeNull();
    expect(rule!.tool).toBe("bash");
    expect(rule!.original).toBe("Bash(git push *)");
    expect(rule!.pattern.test("git push origin main")).toBe(true);
  });

  it("parses valid Write rule", () => {
    const rule = parseRule("Write(*.env)");
    expect(rule).not.toBeNull();
    expect(rule!.tool).toBe("write");
    expect(rule!.pattern.test(".env")).toBe(true);
    expect(rule!.pattern.test("app.env")).toBe(true);
  });

  it("parses Edit rule", () => {
    const rule = parseRule("Edit(secrets/*)");
    expect(rule).not.toBeNull();
    expect(rule!.tool).toBe("edit");
    expect(rule!.pattern.test("secrets/key.pem")).toBe(true);
    expect(rule!.pattern.test("src/secrets.ts")).toBe(false);
  });

  it("returns null for invalid format", () => {
    expect(parseRule("invalid")).toBeNull();
    expect(parseRule("")).toBeNull();
    expect(parseRule("Bash")).toBeNull();
    expect(parseRule("Bash()")).toBeNull();
  });
});
