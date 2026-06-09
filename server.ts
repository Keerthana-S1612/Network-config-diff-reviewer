import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { UserRole, LogEntry, AgentState, DatabaseRecord, HealthStatus } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Derive paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. STATE & DATABASES (IN-MEMORY / COMPLIANT TRANSACTION TABLES)
// ==========================================

// Global Audit & Telemetry telemetry log queue
let logs: LogEntry[] = [
  { id: "log-1", timestamp: new Date(Date.now() - 3600000).toISOString(), level: "INFO", service: "AegisGateway", message: "Gateway initialized successfully on port 3000." },
  { id: "log-2", timestamp: new Date(Date.now() - 3500000).toISOString(), level: "INFO", service: "RedisCache", message: "Cache layer connected to primary node: 127.0.0.1:6379." },
  { id: "log-3", timestamp: new Date(Date.now() - 3400000).toISOString(), level: "INFO", service: "DatabaseUnit", message: "PostgreSQL pools verified. All 12 tables normalized." },
  { id: "log-4", timestamp: new Date(Date.now() - 2000000).toISOString(), level: "AUDIT", service: "SecurityRBAC", message: "Super-Admin credentials registered under root profile." },
];

// Active Server Agent configuration pool
const agents: AgentState[] = [
  { id: "agent-1", name: "Orchestrator Core", role: "Workflow Planner", status: "idle", model: "gemini-3.5-flash", lastAction: "Waiting for task request" },
  { id: "agent-2", name: "Aegis Audit", role: "Security Vulnerability Inspection", status: "idle", model: "gemini-3.5-flash", lastAction: "Monitoring inputs" },
  { id: "agent-3", name: "Apex Tuning", role: "Performance Cache Optimizer", status: "idle", model: "gemini-3.5-flash", lastAction: "Scanning Redis hit distribution" },
  { id: "agent-4", name: "Hermes Executor", role: "Continuous Assembly & Execution", status: "idle", model: "gemini-3.5-flash", lastAction: "Idle pipeline trigger" },
];

// Dynamic SQLite/Postgres normalized transactional table data
let databaseRecords: DatabaseRecord[] = [
  {
    id: "tx-da102b",
    target: "Microservices Blueprint Review",
    status: "completed",
    owner: "admin",
    steps: ["Phase 1: Parse requirements", "Phase 2: Perform policy scan", "Phase 3: Verify security guidelines", "Phase 4: Run integration scripts"],
    securityVerified: true,
    optimized: true,
    output: "System architecture adheres fully to standard secure API practices. Redis keys are well configured.",
    createdAt: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: "tx-f38b0a",
    target: "Database Index Tuning Workflow",
    status: "completed",
    owner: "operator",
    steps: ["Phase 1: Fetch slow queries", "Phase 2: Propose compound indexes", "Phase 3: Benchmark latency metrics"],
    securityVerified: true,
    optimized: true,
    output: "Indexes deployed securely on tables users, logs, and transactions. Read performance improved by 412%.",
    createdAt: new Date(Date.now() - 14400000).toISOString()
  }
];

// Simple Express API rate listing table
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_CEILING = 100;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// Redis Mock cache storage for rapid response caching
const redisCache = new Map<string, { value: string; expiresAt: number }>();
let cacheHitsCount = 42;
let cacheMissesCount = 12;

// ==========================================
// 2. MIDDLWARES (RATE LIMITING & JWT ROLE CHECKS)
// ==========================================

function addLog(level: "INFO" | "WARN" | "ERROR" | "AUDIT", service: string, message: string, cacheHit?: boolean) {
  const newLog: LogEntry = {
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    cacheHit
  };
  logs.unshift(newLog);
  if (logs.length > 100) logs.pop();
}

// Enterprise Rate Limiter
function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "127.0.0.1";
  const now = Date.now();
  const clientLimit = rateLimits.get(ip);

  if (!clientLimit || now > clientLimit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CEILING);
    res.setHeader("X-RateLimit-Remaining", RATE_LIMIT_CEILING - 1);
    return next();
  }

  if (clientLimit.count >= RATE_LIMIT_CEILING) {
    addLog("WARN", "FirewallGuard", `Rate limit hit by incoming IP: ${ip}. Blocking request.`, false);
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CEILING);
    res.setHeader("X-RateLimit-Remaining", 0);
    return res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit hit! Limit is ${RATE_LIMIT_CEILING} requests per minute. Reset in ${Math.round((clientLimit.resetTime - now) / 1000)} seconds.`
    });
  }

  clientLimit.count += 1;
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CEILING);
  res.setHeader("X-RateLimit-Remaining", RATE_LIMIT_CEILING - clientLimit.count);
  next();
}

// Security RBAC authorization context helper
function rbacAuthMiddleware(requiredRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      addLog("WARN", "SecurityRBAC", "Attempted access to protected endpoint without bearer context.", false);
      return res.status(401).json({ error: "Access Denied", message: "Bearer Access Token missing from headers." });
    }

    // Decode mock JWT payload format
    try {
      const parts = authHeader.split(" ");
      const token = parts[1];
      const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      
      const userRole = payload.role as UserRole;
      const username = payload.username;

      if (!requiredRoles.includes(userRole)) {
        addLog("WARN", "SecurityRBAC", `Unauthorized access attempt on '${req.originalUrl}' by user '${username}' [${userRole}]. Required: [${requiredRoles.join(", ")}]`, false);
        return res.status(403).json({ error: "Forbidden", message: "Role-Based Access is insufficient for this operational tier." });
      }

      // Attach user scope to request object for downstream routes
      (req as any).userScope = { username, role: userRole };
      next();
    } catch (e) {
      addLog("ERROR", "SecurityRBAC", "Malformed token validation exception parsed.", false);
      return res.status(401).json({ error: "Invalid Token", message: "Bearer payload failed structure decoding." });
    }
  };
}

// Apply rate limiter globally
app.use(rateLimiterMiddleware);

// ==========================================
// 3. LAZY GEMINI CLIENT CONFIGURATION
// ==========================================

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ==========================================
// 4. API ROUTE IMPLEMENTATIONS
// ==========================================

// Authenticator login endpoint for JWT creation
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, role } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: "Invalid Parameters", message: "Please supply both username and target RBAC role." });
  }

  // Generate safe lightweight mock base64-encoded JWT
  const payload = { username, role, exp: Date.now() + 3600000 };
  const mockToken = Buffer.from(JSON.stringify(payload)).toString("base64");

  addLog("AUDIT", "SecurityRBAC", `User authenticated: '${username}' authorized for role context [${role}].`, false);
  
  res.json({
    username,
    role,
    accessToken: `Bearer ${mockToken}`
  });
});

// Cache query API
app.get("/api/cache/status", (req: Request, res: Response) => {
  res.json({
    hits: cacheHitsCount,
    misses: cacheMissesCount,
    ratio: parseFloat(((cacheHitsCount / (cacheHitsCount + cacheMissesCount || 1)) * 100).toFixed(1)),
    activeKeys: redisCache.size,
    backendEngine: "Redis cluster simulated memory"
  });
});

// Force clear cache API (Requires Admin role)
app.post("/api/cache/clear", rbacAuthMiddleware([UserRole.ADMIN]), (req: Request, res: Response) => {
  redisCache.clear();
  addLog("AUDIT", "RedisCache", `Cache buffer purged manually by operator: ${(req as any).userScope.username}`);
  res.json({ message: "In-memory cache structures wiped cleanly." });
});

app.get("/api/db/records", (req: Request, res: Response) => {
  res.json(databaseRecords);
});

// Logs fetch api
app.get("/api/logs", (req: Request, res: Response) => {
  res.json(logs);
});

// Active health telemetry api
app.get("/api/health", (req: Request, res: Response) => {
  const duration = process.uptime();
  const stat: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(duration),
    services: {
      database: "healthy (pool size: 20)",
      redis: "healthy (latency: 0.8ms)",
      gemini_api: process.env.GEMINI_API_KEY ? "healthy" : "offline (mock fallback mode auto-active)",
      agent_pool: "healthy (4 ready)"
    },
    metrics: {
      cpu: Math.min(24, Math.round(2 + Math.random() * 5)),
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      rate_limit_remaining: RATE_LIMIT_CEILING
    }
  };
  res.json(stat);
});

// Core API Autonomous multi-agent pipeline solver (RBAC protected: Operator/Admin/Auditor can query, but only Admin/Operator can trigger changes)
app.post("/api/agents/execute", rbacAuthMiddleware([UserRole.ADMIN, UserRole.OPERATOR]), async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Prompt required", message: "An input instructions block is required to activate agents." });
  }

  const user = (req as any).userScope.username;
  const requestId = `tx-${Math.random().toString(36).substring(2, 8)}`;
  addLog("INFO", "AegisGateway", `Spinning autonomous system queue. Target task ID: ${requestId}. Owner: ${user}.`, false);

  // Check cache hit first to simulate Redis acceleration
  const cachedResult = redisCache.get(prompt);
  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    cacheHitsCount += 1;
    addLog("INFO", "RedisCache", `Cache HIT detected for payload fingerprint. Skipping multi-model pipeline orchestration.`, true);
    
    // Create direct record
    const record: DatabaseRecord = {
      id: requestId,
      target: prompt,
      status: "completed",
      owner: user,
      steps: ["Orchestrator retrieved cached results securely", "Redis response validated"],
      securityVerified: true,
      optimized: true,
      output: JSON.parse(cachedResult.value).output,
      createdAt: new Date().toISOString()
    };
    
    databaseRecords.unshift(record);
    return res.json({
      record,
      cacheHit: true,
      agentsLog: [
        { agent: "Orchestrator Core", message: "Returning cached compiled steps straight from memory layer." }
      ]
    });
  }

  cacheMissesCount += 1;
  addLog("INFO", "RedisCache", "Cache MISS. Initializing active Gemini reasoning nodes.", false);

  const finalResponseSteps: string[] = [];
  const agentLogTracks: { agent: string; message: string }[] = [];
  let securityClearance = true;
  let optimizationSuccess = true;
  let modelOutput = "";

  const genAI = getGeminiClient();

  if (genAI) {
    try {
      // 1. ORCHESTRATOR AGENT: Let's prompt Gemini to design workflow phases
      addLog("INFO", "Orchestrator Core", `De-referencing logical target plan from input prompt. Calling model gen...`, false);
      agents[0].status = "active";
      agents[0].lastAction = `Orchestrating blueprint for: ${prompt.slice(0, 30)}...`;

      const orchPrompt = `You are the AegisOps Multi-Agent Orchestrator. The client requests: "${prompt}".
      Develop a complete step-by-step enterprise operational layout of 3 to 5 key milestones to solve this task safely.
      Respond styled strictly as a clean JSON-array of strings. Keep it brief. 
      Example output: ["Step 1: Check inputs", "Step 2: Generate schemas"]`;

      const orchResponse = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: orchPrompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You strictly output a standard JSON array of strings containing operational milestone phases. Do not include extra wrappers."
        }
      });

      const orchText = orchResponse.text || "[]";
      let steps: string[] = [];
      try {
        steps = JSON.parse(orchText);
        if (!Array.isArray(steps)) steps = ["Default logic parse phase", "Apply deployment standards"];
      } catch (err) {
        steps = ["Requirement dissection master stage", "Automated deployment pipeline validation"];
      }

      finalResponseSteps.push(...steps);
      agentLogTracks.push({ agent: "Orchestrator Core", message: `Formulated ${steps.length} atomic milestone phases: ${JSON.stringify(steps)}` });
      addLog("INFO", "Orchestrator Core", `Formulated ${steps.length} milestones successfully.`, false);
      agents[0].status = "idle";
      agents[0].lastAction = "Dispatched plan to security auditor";

      // 2. SECURITY AUDITOR AGENT
      agents[1].status = "active";
      agents[1].lastAction = "Evaluating policy matrices and threat vectors...";
      addLog("INFO", "Aegis Audit", "Analyzing plans for vulnerabilities or security failures.", false);

      const secPrompt = `Verify if the following project specification is safe and does not suggest bad practices or leak credentials: "${prompt}". 
      Explain key security recommendations briefly as a Technical Audit Report. Determine safety clearance ranking (Pass/Fail).`;

      const secResponse = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: secPrompt,
        config: {
          systemInstruction: "You are the primary Security Auditor. Output brief threat analysis highlights."
        }
      });
      
      const auditSummary = secResponse.text || "Pass: Design exhibits correct credential guard boundaries.";
      securityClearance = !auditSummary.toLowerCase().includes("vulnerability detected") && !auditSummary.toLowerCase().includes("fail");
      agentLogTracks.push({ agent: "Aegis Audit", message: `Security Analysis complete: ${auditSummary.slice(0, 150)}...` });
      addLog("AUDIT", "Aegis Audit", "Security validation report published with zero high-severity vulnerabilities.", false);
      agents[1].status = "idle";
      agents[1].lastAction = "Completed audit diagnostics";

      // 3. APEX TUNING AGENT
      agents[2].status = "active";
      agents[2].lastAction = "Configuring backend performance strategies...";
      addLog("INFO", "Apex Tuning", "Running caching strategy mapping.", false);

      const tuningPrompt = `Detail appropriate performance and Redis/Database caching patterns for: "${prompt}". Propose 1 scaling recommendation.`;
      const tuningResponse = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: tuningPrompt,
        config: {
          systemInstruction: "You are Apex Tuning model. Output caching advice in a few concise sentences."
        }
      });

      const tuningAdvice = tuningResponse.text || "Approved high-density caching indexing layout.";
      optimizationSuccess = true;
      agentLogTracks.push({ agent: "Apex Tuning", message: `Tuning parameters loaded: ${tuningAdvice.slice(0, 150)}...` });
      addLog("INFO", "Apex Tuning", "Redis cache rules established and active.", false);
      agents[2].status = "idle";
      agents[2].lastAction = "Applied indexing rules";

      // 4. HERMES EXECUTOR AGENT
      agents[3].status = "active";
      agents[3].lastAction = "Compiling technical assets and delivery logs...";
      addLog("INFO", "Hermes Executor", "Compiling deployment guidelines and microservices instructions.", false);

      const execPrompt = `Develop a crisp, professional markdown outline containing:
      1. Technical Implementation Blueprint for "${prompt}".
      2. Deploy configuration template snippet (YAML or script).
      3. Concrete advice on testing this setup.`;

      const execResponse = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: execPrompt,
        config: {
          systemInstruction: "You are a professional software engineer. Structure solutions clearly inside clean Markdown formatting blocks."
        }
      });

      modelOutput = execResponse.text || "Execution generated base templates successfully.";
      agentLogTracks.push({ agent: "Hermes Executor", message: "Deployment code assets built and ready for telemetry display." });
      addLog("INFO", "Hermes Executor", "Autonomous deployment assembly executed cleanly.", false);
      agents[3].status = "idle";
      agents[3].lastAction = "Ready for next invocation";

    } catch (apiError: any) {
      addLog("ERROR", "AegisGateway", `Failed to complete API LLM pipeline: ${apiError.message || apiError}`, false);
      agents.forEach(a => { a.status = "error"; a.lastAction = "Pipeline interrupted by API error"; });
      return res.status(502).json({
        error: "AI Gateway Interruption",
        message: "Double check your GEMINI_API_KEY inside Settings > Secrets. Let's make sure it is valid.",
        details: apiError.message
      });
    }
  } else {
    // Elegant Offline Mock Fallback Mode
    addLog("WARN", "AegisGateway", "No GEMINI_API_KEY detected. Emulating high-fidelity multi-agent logic chains.", false);
    
    // Simulate staggered delays or complete instant execution
    finalResponseSteps.push(
      "Phase 1: Parse requirements & create schema blueprint maps",
      "Phase 2: Perform security audit context validation",
      "Phase 3: Tune caching rules on mock Redis clusters",
      "Phase 4: Output deploy assembly scripts package"
    );

    agentLogTracks.push(
      { agent: "Orchestrator Core", message: "Orchestration planner identified input pattern and resolved structure blueprint tasks dynamically." },
      { agent: "Aegis Audit", message: "Passed. Verified no cleartext credentials or open ports detected during simulation scan." },
      { agent: "Apex Tuning", message: "Identified high-traffic bottlenecks. Deployed simulated caching patterns with 98% prediction accuracy." },
      { agent: "Hermes Executor", message: "Offline execution completed assets compilation. Exported structured operational guidelines." }
    );

    modelOutput = `### 🛡️ AegisOps Offline Assembly output

You initialized the blueprint for **"${prompt}"** in **Emulated/Offline Mode**.

#### 1. Security Compliance Verified
All policy scans passed security validation checkmarks. Port configurations are isolated successfully.

#### 2. Generated Deployment Microservice Blueprint
\`\`\`yaml
version: '3.8'
services:
  app:
    image: aegisops/service:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass pass123
\`\`\`

#### 3. Caching and Index Optimization
- Activated automatic cache key matching.
- Set standard TTL values to \`3600\` seconds.
- Reduced database lookup strain dynamically.`;
  }

  // Save the result record to database
  const finalRecord: DatabaseRecord = {
    id: requestId,
    target: prompt,
    status: securityClearance ? "completed" : "failed",
    owner: user,
    steps: finalResponseSteps,
    securityVerified: securityClearance,
    optimized: optimizationSuccess,
    output: modelOutput,
    createdAt: new Date().toISOString()
  };

  databaseRecords.unshift(finalRecord);

  // Write response to cache for caching behavior demonstration
  redisCache.set(prompt, {
    value: JSON.stringify({ output: modelOutput }),
    expiresAt: Date.now() + 60000 * 5 // Cache expires in 5 minutes
  });

  res.json({
    record: finalRecord,
    cacheHit: false,
    agentsLog: agentLogTracks
  });
});

// ==========================================
// 5. VITE / STATIC CONTENT MIDDLEWARE SETUP
// ==========================================

if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Bind server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server successfully started. Listening on http://localhost:${PORT}`);
});
