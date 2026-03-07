-- 0016_conversations.sql
-- Dedicated table for chat/channel conversations.
-- These are interaction logs — NOT agent task queue entries.
-- Tasks are only created when a user explicitly triggers agent execution.

CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT        PRIMARY KEY,          -- ulid
    workspace_id UUID       NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id  TEXT,                             -- client-provided session grouping
    source      TEXT        NOT NULL DEFAULT 'dashboard', -- dashboard | telegram | slack | discord | api | widget
    message     TEXT        NOT NULL,             -- original user message
    reply       TEXT,                             -- agent reply, null if failed
    error_msg   TEXT,                             -- classified error if status=failed
    status      TEXT        NOT NULL DEFAULT 'complete', -- complete | failed | pending
    intent      TEXT,                             -- CONVERSATION | TASK | PROJECT (classifier output)
    task_id     TEXT        REFERENCES tasks(id) ON DELETE SET NULL, -- set if a task was spawned from this conversation
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_workspace_idx ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS conversations_workspace_created_idx ON conversations(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_session_idx ON conversations(session_id) WHERE session_id IS NOT NULL;
