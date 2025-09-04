# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple, transparent website proxy service built on Cloudflare Workers with Durable Objects. It provides a direct proxy to https://robot-sms.xyz/ with no authentication required - visiting your Worker URL will show the exact same content as the target website.

## Development Commands

```bash
# Development server
pnpm run dev          # Start local development server with Wrangler
pnpm start           # Alternative to pnpm run dev

# Deployment  
pnpm run deploy      # Deploy to Cloudflare Workers

# Type generation
pnpm run cf-typegen  # Generate TypeScript types from Wrangler configuration
```

## Architecture

**Core Components:**
- `src/index.ts` - Simple routing that forwards all requests to Durable Object
- `src/handler.ts` - WebsiteProxy Durable Object that handles all proxy logic

**Technology Stack:**
- **Cloudflare Workers** + **Durable Objects** for serverless execution
- **Hono** web framework for basic routing  
- **TypeScript** with strict configuration
- **PNPM** for package management

**Key Features:**
- **Transparent Proxying**: All requests are directly proxied to https://robot-sms.xyz/
- **URL Rewriting**: HTML content is modified so all links work through the proxy
- **CORS Support**: Handles cross-origin requests properly
- **No Authentication**: Direct access without any login or API keys required

## How It Works

1. **Request Flow**: User visits your Worker URL → Request goes to WebsiteProxy Durable Object → Proxy fetches from robot-sms.xyz → Response sent back to user
2. **URL Rewriting**: HTML responses are processed to rewrite URLs so they point through your proxy
3. **Header Management**: Appropriate headers are set/removed to ensure proper proxying

## Usage

Simply visit your deployed Worker URL and you'll see the exact same website as https://robot-sms.xyz/ - no setup or configuration needed.

## Configuration

**Wrangler Configuration (wrangler.jsonc):**
- Uses `WebsiteProxy` Durable Object
- No environment variables required
- Target URL is hardcoded to `https://robot-sms.xyz`

## Code Style

- **TypeScript** strict mode with ES2021 target
- **Minimal Dependencies**: Only Hono framework for routing
- **Clean Architecture**: Simple request forwarding with URL rewriting