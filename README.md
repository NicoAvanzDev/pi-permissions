# pi-permissions

A [pi](https://github.com/badlogic/pi) extension that provides configurable allow/deny permission rules for tool calls — similar to Claude's permission system.

## Install

```bash
# From npm
pi install npm:pi-permissions

# From GitHub
pi install https://github.com/NicoAvanzDev/pi-permissions

# Project-local (shared with team)
pi install -l https://github.com/NicoAvanzDev/pi-permissions

# Try without installing
pi -e npm:pi-permissions
```

## Configuration

Create a `permissions.json` file in one of these locations:

| Location | Scope |
|----------|-------|
| `.pi/permissions.json` | Project-local (checked first) |
| `~/.pi/agent/permissions.json` | Global fallback |

### Example

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(git commit *)",
      "Bash(git diff *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(* --version)",
      "Bash(* --help *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(git add .)",
      "Bash(rm -rf *)",
      "Write(*.env)",
      "Write(.env.*)",
      "Edit(*.env)"
    ]
  }
}
```

## Rule Format

Rules use the format `Tool(pattern)` where:

- **Tool** — the pi tool name: `Bash`, `Write`, `Edit`, `Read`
- **pattern** — a glob pattern where `*` matches any characters

### Supported Tools

| Tool | What the pattern matches against |
|------|----------------------------------|
| `Bash(pattern)` | The bash command string |
| `Write(pattern)` | The file path being written |
| `Edit(pattern)` | The file path being edited |
| `Read(pattern)` | The file path being read |

### Evaluation Logic

1. **Deny rules are checked first** — if any deny rule matches, the call is blocked
2. **Allow rules are checked next** — if allow rules exist for the tool, the call must match at least one
3. **No rules = no restrictions** — if no allow rules exist for a tool, all calls pass (unless denied)

This means:
- Use **deny** to block specific dangerous commands
- Use **allow** to whitelist only approved commands (everything else is blocked)
- **Deny always wins** over allow

### Pattern Examples

| Pattern | Matches | Doesn't match |
|---------|---------|---------------|
| `Bash(git push *)` | `git push origin main` | `git pull` |
| `Bash(npm run *)` | `npm run build`, `npm run test` | `npm install` |
| `Bash(* --version)` | `node --version`, `npm --version` | `node index.js` |
| `Write(*.env)` | `.env`, `app.env` | `.env.example` |
| `Write(secrets/*)` | `secrets/key.pem` | `src/secrets.ts` |

## Reloading

After editing `permissions.json`, type `/reload` in pi to apply the changes.

## License

MIT
