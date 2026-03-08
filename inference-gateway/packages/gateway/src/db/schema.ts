import { pgTable, uuid, text, integer, bigint, timestamp, jsonb, boolean, numeric, unique } from 'drizzle-orm/pg-core'

export const instances = pgTable('instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  instanceId: text('instance_id').notNull().unique(),
  signingSecret: text('signing_secret').notNull(),
  plexoVersion: text('plexo_version'),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  ipAllowlist: text('ip_allowlist').array(),
  metadata: jsonb('metadata').default({}),
})

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  instanceId: uuid('instance_id').references(() => instances.id),
  workspaceId: text('workspace_id').notNull(),
  status: text('status', { enum: ['active', 'suspended', 'revoked'] }).notNull().default('active'),
  quotaTokensDaily: bigint('quota_tokens_daily', { mode: 'number' }),
  quotaTokensWeekly: bigint('quota_tokens_weekly', { mode: 'number' }),
  quotaTokensMonthly: bigint('quota_tokens_monthly', { mode: 'number' }),
  quotaRequestsDaily: integer('quota_requests_daily'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
})

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  instanceId: uuid('instance_id').notNull().references(() => instances.id),
  taskId: text('task_id'),
  taskType: text('task_type'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  tokensThinking: integer('tokens_thinking').default(0),
  cacheWriteTokens: integer('cache_write_tokens').default(0),
  cacheReadTokens: integer('cache_read_tokens').default(0),
  latencyMs: integer('latency_ms'),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 8 }).notNull(),
  billedCostUsd: numeric('billed_cost_usd', { precision: 12, scale: 8 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const quotaWindows = pgTable('quota_windows', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  windowType: text('window_type', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  tokensUsed: bigint('tokens_used', { mode: 'number' }).notNull().default(0),
  requestsUsed: integer('requests_used').notNull().default(0),
}, (t) => ({
  uniqueWindow: unique().on(t.apiKeyId, t.windowType, t.windowStart)
}))

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  instanceId: uuid('instance_id').references(() => instances.id),
  severity: text('severity', { enum: ['info', 'warn', 'error', 'critical'] }).notNull().default('info'),
  details: jsonb('details').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // NOTE: This table is append-only matching the spec stringently. Do not UPDATE or DELETE.
})

export const anomalyEvents = pgTable('anomaly_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  instanceId: uuid('instance_id').references(() => instances.id),
  anomalyType: text('anomaly_type').notNull(),
  details: jsonb('details').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Used exclusively by the admin dashboard package via a separate instance of `drizzle-orm` or shared file
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
})

import { relations } from 'drizzle-orm'

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  instance: one(instances, {
    fields: [apiKeys.instanceId],
    references: [instances.id],
  }),
}))

export const instancesRelations = relations(instances, ({ many }) => ({
  apiKeys: many(apiKeys),
}))
