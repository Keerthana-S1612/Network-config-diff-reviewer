/**
 * AegisOps Configuration & Shared Type System
 */

export enum UserRole {
  ADMIN = "admin",
  OPERATOR = "operator",
  AUDITOR = "auditor",
  GUEST = "guest",
}

export interface UserSession {
  username: string;
  role: UserRole;
  accessToken: string;
}

export type WorkflowStatus = "idle" | "queued" | "analyzing" | "auditing" | "tuning" | "executing" | "completed" | "failed";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "AUDIT";
  service: string;
  message: string;
  cacheHit?: boolean;
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "error";
  model: string;
  lastAction: string;
}

export interface DatabaseRecord {
  id: string;
  target: string;
  status: string;
  owner: string;
  steps: string[];
  securityVerified: boolean;
  optimized: boolean;
  output?: string;
  createdAt: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  services: {
    database: string;
    redis: string;
    gemini_api: string;
    agent_pool: string;
  };
  metrics: {
    cpu: number;
    memory: string;
    rate_limit_remaining: number;
  };
}

export interface RateLimitStatus {
  ip: string;
  requestsRemaining: number;
  limit: number;
  resetTime: string;
}
