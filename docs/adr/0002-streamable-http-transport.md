# ADR 0002: Streamable HTTP Transport

Status: Accepted

Date: 2026-09-18

Supersedes: the transport section of ADR 0001

## Context

The original v0.1 implementation used stdio. The project now needs an HTTP
endpoint that can be consumed by local desktop clients, web-capable clients,
and other MCP clients using the Streamable HTTP specification.

## Decision

Replace the stdio transport with stateless Streamable HTTP.

The server:

- Accepts MCP JSON-RPC requests at `POST /mcp`
- Defaults to `http://127.0.0.1:3000/mcp`
- Uses `enableJsonResponse: true`
- Creates a fresh MCP server and transport for each request
- Does not create or validate session IDs
- Does not implement GET SSE streams or DELETE session termination
- Returns `405 Method Not Allowed` for `GET /mcp` and `DELETE /mcp`
- Validates the `Host` header and browser `Origin` header
- Allows requests without an `Origin` header for non-browser MCP clients
- Supports `MCP_PORT` and `MCP_ALLOWED_ORIGINS` environment variables

## Security Boundary

The default bind address is `127.0.0.1`. This transport has no authentication
or TLS. It must not be exposed publicly without a separate security design.

## Consequences

- Existing stdio client configurations must switch to the HTTP endpoint.
- Tool handlers remain stateless and reusable without change.
- Request-scoped transports prevent message ID collisions between clients.
- Remote deployment, authentication, and TLS remain out of scope for v0.1.
