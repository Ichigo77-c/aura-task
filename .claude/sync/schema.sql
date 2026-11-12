-- Real Synchronization Bridge Schema
-- Shared message queue between Claude Code and OpenCode

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'claude-code' | 'opencode'
    status TEXT NOT NULL DEFAULT 'idle', -- 'idle' | 'busy' | 'offline'
    last_heartbeat INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    metadata TEXT -- JSON
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    type TEXT NOT NULL, -- 'task' | 'result' | 'status' | 'context'
    content TEXT NOT NULL, -- JSON payload
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'delivered' | 'processed' | 'failed'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    delivered_at INTEGER,
    processed_at INTEGER,
    parent_message_id TEXT,
    FOREIGN KEY (from_agent) REFERENCES agents(id),
    FOREIGN KEY (to_agent) REFERENCES agents(id),
    FOREIGN KEY (parent_message_id) REFERENCES messages(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'failed'
    result TEXT, -- JSON
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (assigned_to) REFERENCES agents(id),
    FOREIGN KEY (created_by) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'agent_online' | 'agent_offline' | 'message_sent' | 'task_started' | etc.
    agent_id TEXT,
    payload TEXT NOT NULL, -- JSON
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON messages(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
