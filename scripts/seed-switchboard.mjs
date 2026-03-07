/**
 * One-time seed script: inserts ProcurePilot, DataForge Web, DataForge Search
 * into agentServices if they don't already exist.
 * Run: node scripts/seed-switchboard.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse mysql2 connection from URL
const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const services = [
  {
    name: "ProcurePilot",
    description:
      "Buyer-facing procurement API. Submit a task brief and budget — ProcurePilot decomposes it into sub-tasks, discovers the best vendor agents (DataForge Web, DataForge Search), runs trials, scores results, and assembles a final delivery packet with spend breakdown and confidence scores.",
    category: "procurement",
    creditsPerRequest: "30.00",
    totalCreditsPool: "50000.00",
    capabilities: JSON.stringify([
      "task decomposition",
      "vendor discovery",
      "trial orchestration",
      "result scoring",
      "spend tracking",
      "brief assembly",
    ]),
    nvmPlanId: "procurepilot_nvm_plan_switchboard",
    nvmAgentId: "procurepilot_nvm_agent_switchboard",
    endpoint: "https://switchboardai.ayushojha.com/api/procurepilot/procure",
    isActive: 1,
  },
  {
    name: "DataForge Web",
    description:
      "Paid web scraping and extraction seller. Accepts a URL and returns normalized structured data with confidence scores, provenance metadata, and surge-priced credits. Verifies x402 payment before serving results.",
    category: "scraping",
    creditsPerRequest: "10.00",
    totalCreditsPool: "20000.00",
    capabilities: JSON.stringify([
      "web scraping",
      "structured extraction",
      "surge pricing",
      "provenance metadata",
      "confidence scoring",
    ]),
    nvmPlanId:
      "87243775557809620406811462333406929215670569276922516691841478531555517979134",
    nvmAgentId: "dataforge_web_nvm_agent_switchboard",
    endpoint: "https://switchboardai.ayushojha.com/api/dataforge-web/scrape",
    isActive: 1,
  },
  {
    name: "DataForge Search",
    description:
      "Paid research and search seller. Accepts a topic, expands it into multiple queries, fetches results from multiple sources, deduplicates and ranks them by relevance and freshness, and returns results with confidence metadata.",
    category: "research",
    creditsPerRequest: "12.00",
    totalCreditsPool: "20000.00",
    capabilities: JSON.stringify([
      "query expansion",
      "multi-source search",
      "deduplication",
      "relevance ranking",
      "freshness scoring",
      "confidence metadata",
    ]),
    nvmPlanId:
      "20525280098953834660118374760884658206838276532391353027417693253911209808544",
    nvmAgentId: "dataforge_search_nvm_agent_switchboard",
    endpoint:
      "https://switchboardai.ayushojha.com/api/dataforge-search/search",
    isActive: 1,
  },
];

for (const svc of services) {
  // Check if already exists by name
  const [rows] = await conn.execute(
    "SELECT id FROM agent_services WHERE name = ? LIMIT 1",
    [svc.name]
  );
  if (rows.length > 0) {
    console.log(`⏭  ${svc.name} already exists (id=${rows[0].id}), skipping.`);
    continue;
  }
  await conn.execute(
    `INSERT INTO agent_services
      (name, description, category, creditsPerRequest, totalCreditsPool, capabilities, nvmPlanId, nvmAgentId, endpoint, isActive, totalRequests, avgResponseTime, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())`,
    [
      svc.name,
      svc.description,
      svc.category,
      svc.creditsPerRequest,
      svc.totalCreditsPool,
      svc.capabilities,
      svc.nvmPlanId,
      svc.nvmAgentId,
      svc.endpoint,
      svc.isActive,
    ]
  );
  console.log(`✅  Inserted ${svc.name}`);
}

await conn.end();
console.log("Done.");

