# Plugin SDK

## Overview

The Plexo Plugin SDK (`@plexo/sdk`) enables third-party extensions to add tools, dashboard cards, channels, cron jobs, and more. Plugins run in isolated Node.js worker threads — a crash never affects the core process.

## Installation

```bash
npm install @plexo/sdk
```

## Quick Start

```typescript
import { sdk } from '@plexo/sdk'

// Register a tool the agent can call
sdk.agent.registerTool(
  'my_tool',
  'Description of what this tool does',
  {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
  async (input) => {
    const result = await doSomething(input.query)
    return { success: true, output: result }
  },
)

// Add a dashboard card
sdk.dashboard.registerCard('my-card', {
  title: 'My Card',
  description: 'Shows useful information',
  defaultSize: { w: 4, h: 3 },
  component: 'MyCardComponent',
})

// Schedule a recurring task
sdk.cron.register('daily-check', '0 9 * * *', async (ctx) => {
  // Runs every day at 9 AM
})
```

## Plugin Manifest

Every plugin requires a `plexo-plugin.json` manifest:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Your Name",
  "type": "skill",
  "permissions": ["agent.tools", "dashboard.cards"],
  "settings": {
    "api_key": {
      "type": "secret",
      "label": "API Key",
      "description": "Your service API key",
      "required": true
    }
  },
  "entrypoint": "dist/index.js",
  "minPlexoVersion": "0.1.0"
}
```

## API Reference

### `sdk.agent`
- `registerTool(name, description, schema, handler)` — Register a tool callable by the agent
- `injectContext(markdown)` — Add persistent context to every agent session

### `sdk.dashboard`
- `registerCard(id, config)` — Register a dashboard card component

### `sdk.cron`
- `register(name, schedule, handler, options?)` — Schedule a recurring task

### `sdk.channels`
- `register(name, adapter)` — Register a messaging channel adapter

### `sdk.events`
- `on(event, handler)` — Listen for events
- `emit(event, data)` — Emit an event

### `sdk.storage`
- `get(key)` — Get a value
- `set(key, value, options?)` — Set a value with optional TTL
- `delete(key)` — Delete a value
- `list(prefix?)` — List keys

### `sdk.settings`
- `get(key)` — Get a plugin setting value
- `getAll()` — Get all plugin settings

## Crash Policy

If a plugin crashes:
1. Automatic restart with 5-second backoff
2. Maximum 3 restarts per hour
3. If exceeded, plugin is disabled and operator is notified
4. Core process is never affected
