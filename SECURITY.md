# Security

## IMPORTANT

We do not accept AI-generated security reports. If you submit one it will be
closed. Write your report in your own words.

## Authorized use only

Huntagent is an offensive-security agent with access to powerful tools
including shell execution, file operations, and network/web access. Use it only
against systems you own or have explicit written authorization to test. Misuse
is your responsibility, not a vulnerability in the project.

## Threat Model

### Overview

Huntagent is an AI-powered pentesting agent that runs locally on your machine.
It provides an agent system with access to shell execution, file operations,
and web access.

### No Sandbox

Huntagent does **not** sandbox the agent. The permission system exists as a UX
feature to help you stay aware of what the agent is doing — it prompts for
confirmation before running commands, writing files, etc. It is **not** designed
to provide security isolation.

If you need true isolation, run Huntagent inside a Docker container or VM. This
is strongly recommended for pentest workloads.

### Server Mode

Server mode is opt-in only. When enabled, set `HUNTAGENT_SERVER_PASSWORD` to
require HTTP Basic Auth. Without it, the server runs unauthenticated (with a
warning). Securing the server is the operator's responsibility.

### Out of Scope

| Category | Rationale |
| --- | --- |
| **Server access when opted-in** | If you enable server mode, API access is expected behavior |
| **Sandbox escapes** | The permission system is not a sandbox (see above) |
| **LLM provider data handling** | Data sent to your configured provider is governed by their policies |
| **MCP server behavior** | External MCP servers you configure are outside our trust boundary |
| **Malicious config files** | Users control their own config; modifying it is not an attack vector |

---

## Reporting Security Issues

Please disclose responsibly. Do **not** open a public issue for security
reports.

To report a security issue, use the GitHub Security Advisory
["Report a Vulnerability"](https://github.com/JustinBKG/huntagent/security/advisories/new)
tab, or email the maintainers at `<security-contact>`.

You will receive a response with next steps, and updates on progress toward a
fix.
