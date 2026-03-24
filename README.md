# pi-permissions [![npm version](https://img.shields.io/npm/v/pi-permissions)](https://www.npmjs.com/package/pi-permissions) [![license](https://img.shields.io/npm/l/pi-permissions)](./LICENSE)

A [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) extension that provides **configurable allow/deny permission rules** for tool calls — control which bash commands, file reads, writes, and edits the agent can perform.

- Define **allow** rules to whitelist specific commands
- Define **deny** rules to block dangerous operations
- Deny always wins — block `git push` even if `git *` is allowed
- Supports glob patterns with `*` wildcards
- Project-local or global configuration

## Install

```bash
pi install npm:pi-permissions
```

Alternative install methods

From the public git repo:

```bash
pi install git:github.com/NicoAvanzDev/pi-permissions
```

From a local clone:

```bash
pi install .
```

Load without installing:

```bash
pi --no-extensions -e npm:pi-permissions
```

## Quick start

Create `.pi/permissions.json` in your project (or `~/.pi/agent/permissions.json` for global rules):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(git commit *)",
      "Bash(git diff *)",
      "Bash(git status)",
      "Bash(git log *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Write(*.env)",
      "Edit(*.env)"
    ]
  }
}
```

On session start, the extension loads your rules and reports how many were found. Any tool call that matches a deny rule is blocked before execution.

### Example session

```text
> pi
Permissions loaded: 6 allow, 4 deny rules

> (agent tries to run `git push origin main`)
⛔ Blocked: Bash command matches deny rule "Bash(git push *)"
```

After editing `permissions.json`, type `/reload` in pi to apply the changes.

## How it works

### Rule format

Rules use the format `Tool(pattern)` where:

- **Tool** — the pi tool name: `Bash`, `Write`, `Edit`, `Read`
- **pattern** — a glob pattern where `*` matches any characters

### Supported tools

| Tool | What the pattern matches against |
|------|----------------------------------|
| `Bash(pattern)` | The bash command string |
| `Write(pattern)` | The file path being written |
| `Edit(pattern)` | The file path being edited |
| `Read(pattern)` | The file path being read |

### Evaluation logic

For every tool call the extension:

1. **checks deny rules first** — if any deny rule matches, the call is blocked
2. **checks allow rules next** — if allow rules exist for that tool, the call must match at least one
3. **passes through** — if no allow rules exist for the tool, all calls are permitted (unless denied)

This means:
- Use **deny** to block specific dangerous commands
- Use **allow** to whitelist only approved commands (everything else is blocked)
- **Deny always wins** over allow

### Pattern examples

| Pattern | Matches | Doesn't match |
|---------|---------|---------------|
| `Bash(git push *)` | `git push origin main` | `git pull` |
| `Bash(npm run *)` | `npm run build`, `npm run test` | `npm install` |
| `Bash(* --version)` | `node --version`, `npm --version` | `node index.js` |
| `Write(*.env)` | `.env`, `app.env` | `.env.example` |
| `Write(secrets/*)` | `secrets/key.pem` | `src/secrets.ts` |

## Configuration

| Location | Scope |
|----------|-------|
| `.pi/permissions.json` | Project-local (checked first) |
| `~/.pi/agent/permissions.json` | Global fallback |

The extension checks the project-local path first. If not found, it falls back to the global config.

## Notes

- rules are loaded once on session start
- use `/reload` to pick up changes without restarting
- deny rules are always evaluated before allow rules
- if no allow rules exist for a tool type, all calls for that tool are permitted
- glob `*` matches any sequence of characters (including path separators in file patterns)

## License

MIT
