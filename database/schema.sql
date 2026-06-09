-- AegisOps Enterprise Schema Specification
-- Target Platform: PostgreSQL v15+ (Relational Table structures)
-- Description: Normalized schema representing Users, Roles, Auditing loops, and Autonomous workflows database state.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLE DEFINITION AND DOMAIN SCOPING
CREATE TYPE rbac_role AS ENUM ('admin', 'operator', 'auditor', 'guest');
CREATE TYPE task_status AS ENUM ('queued', 'analyzing', 'auditing', 'tuning', 'executing', 'completed', 'failed');

-- 2. USERS TABLE (Core Identity)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role rbac_role NOT NULL DEFAULT 'guest',
    rate_limit_quota INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. WORKFLOW TASKS TABLE (Normalized transactional records table)
CREATE TABLE IF NOT EXISTS workflow_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    overall_status task_status NOT NULL DEFAULT 'queued',
    security_verified BOOLEAN NOT NULL DEFAULT FALSE,
    cache_optimized BOOLEAN NOT NULL DEFAULT FALSE,
    compiled_markdown TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. WORKFLOW STEPS TABLE (1-to-many child table capturing agent execution pipelines)
CREATE TABLE IF NOT EXISTS workflow_steps (
    step_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES workflow_tasks(task_id) ON DELETE CASCADE,
    step_sequence INT NOT NULL,
    agent_name VARCHAR(150) NOT NULL,
    milestone_message TEXT NOT NULL,
    execution_latency_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUDIT LOGS TABLE (For Security Monitoring & Compliance Compliance and RBAC events tracking)
CREATE TABLE IF NOT EXISTS security_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acting_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_level VARCHAR(30) NOT NULL, -- INFO, AUDIT, WARN, ERROR
    originating_service VARCHAR(150) NOT NULL, -- Gateway, SecurityRBAC, Redis, etc.
    message_payload TEXT NOT NULL,
    client_ip VARCHAR(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CACHE MANAGEMENT METRICS RECORD TABLE
CREATE TABLE IF NOT EXISTS cache_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cache_hits INT NOT NULL DEFAULT 0,
    cache_misses INT NOT NULL DEFAULT 0,
    active_keys_count INT NOT NULL DEFAULT 0
);

-- ==========================================
-- PERFORMANCE INDEX TUNING SPECIFICATIONS
-- ==========================================

-- Speed up query performance dramatically during audits and dashboards
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_owner_id ON workflow_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(overall_status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_task ON workflow_steps(task_id, step_sequence);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON security_audit_logs(event_level, created_at);

-- Clean database update trigger
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TRIGGER trigger_update_workflow_tasks_timestamp
    BEFORE UPDATE ON workflow_tasks
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
