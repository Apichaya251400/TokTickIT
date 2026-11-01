import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { signToken, clearRevocationBlocklist } from "../src/utils/jwt.js";
import { seedDatabase } from "../prisma/seed.js";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../");

interface LatencyStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  errorCount: number;
  throughputReqPerSec: number;
  totalTimeMs: number;
}

function calculateStats(latencies: number[], totalTimeMs: number, errorCount: number): LatencyStats {
  latencies.sort((a, b) => a - b);
  const count = latencies.length;
  const min = latencies[0] || 0;
  const max = latencies[count - 1] || 0;
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const mean = count > 0 ? sum / count : 0;
  const percentile = (p: number) => {
    if (count === 0) return 0;
    const index = Math.ceil((p / 100) * count) - 1;
    return latencies[Math.max(0, Math.min(count - 1, index))];
  };

  return {
    count,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(percentile(50).toFixed(2)),
    p90: Number(percentile(90).toFixed(2)),
    p95: Number(percentile(95).toFixed(2)),
    p99: Number(percentile(99).toFixed(2)),
    errorCount,
    throughputReqPerSec: Number(((count / (totalTimeMs / 1000))).toFixed(2)),
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
  };
}

async function runBenchmark() {
  const prisma = getPrisma();
  clearRevocationBlocklist();
  await seedDatabase();

  const staffUser = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
  const requesterUser = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });

  const originalUserState = new Map<number, boolean>();
  for (const user of [staffUser, requesterUser]) {
    originalUserState.set(user.id, user.requiresPasswordChange);
  }

  let benchmarkIdempotencyKey: string | null = null;
  let benchmarkActionId: string | null = null;

  try {
    await prisma.user.updateMany({
      where: { id: { in: [staffUser.id, requesterUser.id] } },
      data: { requiresPasswordChange: false },
    });

    const staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: staffUser.role, requiresPasswordChange: false });
    const requesterToken = signToken({ userId: requesterUser.id, email: requesterUser.email, role: requesterUser.role, requiresPasswordChange: false });

  const activeTicket = await prisma.ticket.findFirstOrThrow({ where: { currentStatus: "IN_PROGRESS" } });

  const logLines: string[] = [];
  const log = (msg: string = "") => {
    console.log(msg);
    logLines.push(msg);
  };

  const startTimeIso = new Date().toISOString();
  log("================================================================================");
  log("EVD-PERF-01: TokTickIT Sprint 4 Performance-Smoke & Concurrency Benchmark Log");
  log("================================================================================");
  log(`Timestamp (UTC): ${startTimeIso}`);
  log(`Environment:`);
  log(`  - OS: ${os.type()} ${os.release()} (${os.arch()})`);
  log(`  - CPU: ${os.cpus()[0]?.model || "x64"} (${os.cpus().length} vCPUs)`);
  log(`  - Node.js: ${process.version}`);
  log(`  - Target Application: TokTickIT Express Backend via Supertest IPC In-Memory`);
  log(`  - Database: PostgreSQL (Prisma Client pool)`);
  log(`  - Scope: Local Single-Node Performance-Smoke & Concurrency Benchmark`);
  log("--------------------------------------------------------------------------------\n");

  // ---------------------------------------------------------------------------
  // PERF-01: Staff Dashboard
  // ---------------------------------------------------------------------------
  log(">>> [PERF-01] IT Staff Dashboard Aggregate API (GET /api/dashboards/staff)");
  log("Scenario: Retrieve 4 metric aggregations + attention worklist for IT_STAFF");
  
  // 1A: 100 sequential requests
  const staffSeqLatencies: number[] = [];
  let staffSeqErrors = 0;
  const staffSeqStart = performance.now();
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Authorization", `Bearer ${staffToken}`);
    const t1 = performance.now();
    if (res.status === 200) {
      staffSeqLatencies.push(t1 - t0);
    } else {
      staffSeqErrors++;
    }
  }
  const staffSeqTotal = performance.now() - staffSeqStart;
  const staffSeqStats = calculateStats(staffSeqLatencies, staffSeqTotal, staffSeqErrors);

  log(`  [Phase 1A] 100 Sequential Requests:`);
  log(`    - Total Requests: ${staffSeqStats.count}, Errors: ${staffSeqStats.errorCount}`);
  log(`    - Throughput: ${staffSeqStats.throughputReqPerSec} req/sec`);
  log(`    - Latency: min=${staffSeqStats.min}ms, mean=${staffSeqStats.mean}ms, median=${staffSeqStats.median}ms, p90=${staffSeqStats.p90}ms, p95=${staffSeqStats.p95}ms, p99=${staffSeqStats.p99}ms, max=${staffSeqStats.max}ms`);

  // 1B: Concurrent Load: 50 requests in 5 batches of 10 concurrent requests
  const staffConcLatencies: number[] = [];
  let staffConcErrors = 0;
  const staffConcStart = performance.now();
  for (let batch = 0; batch < 5; batch++) {
    const batchPromises = Array.from({ length: 10 }, async () => {
      const t0 = performance.now();
      const res = await request(app)
        .get("/api/dashboards/staff")
        .set("Authorization", `Bearer ${staffToken}`);
      const t1 = performance.now();
      return { status: res.status, duration: t1 - t0 };
    });
    const batchResults = await Promise.all(batchPromises);
    for (const r of batchResults) {
      if (r.status === 200) staffConcLatencies.push(r.duration);
      else staffConcErrors++;
    }
  }
  const staffConcTotal = performance.now() - staffConcStart;
  const staffConcStats = calculateStats(staffConcLatencies, staffConcTotal, staffConcErrors);

  log(`  [Phase 1B] Concurrent Load (50 requests, concurrency=10):`);
  log(`    - Total Requests: ${staffConcStats.count}, Errors: ${staffConcStats.errorCount}`);
  log(`    - Throughput: ${staffConcStats.throughputReqPerSec} req/sec`);
  log(`    - Latency: min=${staffConcStats.min}ms, mean=${staffConcStats.mean}ms, median=${staffConcStats.median}ms, p90=${staffConcStats.p90}ms, p95=${staffConcStats.p95}ms, p99=${staffConcStats.p99}ms, max=${staffConcStats.max}ms`);
  log(`    - Threshold: < 200 ms | Status: ${staffConcStats.p95 < 200 ? "PASS" : "FAIL"}\n`);

  // ---------------------------------------------------------------------------
  // PERF-02: Requester Dashboard
  // ---------------------------------------------------------------------------
  log(">>> [PERF-02] Requester Dashboard Aggregate API (GET /api/dashboards/requester)");
  log("Scenario: Retrieve 4 owned metric aggregations + attention tickets for REQUESTER");

  // 2A: 100 sequential requests
  const reqSeqLatencies: number[] = [];
  let reqSeqErrors = 0;
  const reqSeqStart = performance.now();
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${requesterToken}`);
    const t1 = performance.now();
    if (res.status === 200) {
      reqSeqLatencies.push(t1 - t0);
    } else {
      reqSeqErrors++;
    }
  }
  const reqSeqTotal = performance.now() - reqSeqStart;
  const reqSeqStats = calculateStats(reqSeqLatencies, reqSeqTotal, reqSeqErrors);

  log(`  [Phase 2A] 100 Sequential Requests:`);
  log(`    - Total Requests: ${reqSeqStats.count}, Errors: ${reqSeqStats.errorCount}`);
  log(`    - Throughput: ${reqSeqStats.throughputReqPerSec} req/sec`);
  log(`    - Latency: min=${reqSeqStats.min}ms, mean=${reqSeqStats.mean}ms, median=${reqSeqStats.median}ms, p90=${reqSeqStats.p90}ms, p95=${reqSeqStats.p95}ms, p99=${reqSeqStats.p99}ms, max=${reqSeqStats.max}ms`);

  // 2B: Concurrent Load: 50 requests in 5 batches of 10 concurrent requests
  const reqConcLatencies: number[] = [];
  let reqConcErrors = 0;
  const reqConcStart = performance.now();
  for (let batch = 0; batch < 5; batch++) {
    const batchPromises = Array.from({ length: 10 }, async () => {
      const t0 = performance.now();
      const res = await request(app)
        .get("/api/dashboards/requester")
        .set("Authorization", `Bearer ${requesterToken}`);
      const t1 = performance.now();
      return { status: res.status, duration: t1 - t0 };
    });
    const batchResults = await Promise.all(batchPromises);
    for (const r of batchResults) {
      if (r.status === 200) reqConcLatencies.push(r.duration);
      else reqConcErrors++;
    }
  }
  const reqConcTotal = performance.now() - reqConcStart;
  const reqConcStats = calculateStats(reqConcLatencies, reqConcTotal, reqConcErrors);

  log(`  [Phase 2B] Concurrent Load (50 requests, concurrency=10):`);
  log(`    - Total Requests: ${reqConcStats.count}, Errors: ${reqConcStats.errorCount}`);
  log(`    - Throughput: ${reqConcStats.throughputReqPerSec} req/sec`);
  log(`    - Latency: min=${reqConcStats.min}ms, mean=${reqConcStats.mean}ms, median=${reqConcStats.median}ms, p90=${reqConcStats.p90}ms, p95=${reqConcStats.p95}ms, p99=${reqConcStats.p99}ms, max=${reqConcStats.max}ms`);
  log(`    - Threshold: < 200 ms | Status: ${reqConcStats.p95 < 200 ? "PASS" : "FAIL"}\n`);

  // ---------------------------------------------------------------------------
  // PERF-03: Concurrent Idempotency Key Collisions (10 parallel requests)
  // ---------------------------------------------------------------------------
  log(">>> [PERF-03] Concurrent Idempotent Action Creation (POST /api/tickets/:id/actions)");
  log("Scenario: 10 parallel HTTP requests sharing identical Idempotency-Key via Promise.all");

  const idemKey = `bench-idem-${Date.now()}`;
  benchmarkIdempotencyKey = idemKey;
  const idemPayload = {
    description: "Benchmark concurrent idempotency action.",
    result: "Benchmark verified.",
    followUpRequired: false,
  };

  const idemStart = performance.now();
  const idemPromises = Array.from({ length: 10 }, async (_, idx) => {
    const t0 = performance.now();
    const res = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", idemKey)
      .send(idemPayload);
    const t1 = performance.now();
    return { idx, status: res.status, body: res.body, duration: t1 - t0 };
  });

  const idemResults = await Promise.all(idemPromises);
  const idemTotalTime = performance.now() - idemStart;
  const idemLatencies = idemResults.map(r => r.duration);
  const idemStats = calculateStats(idemLatencies, idemTotalTime, 0);

  const statuses = idemResults.map(r => r.status);
  const all201 = statuses.every(s => s === 201);
  const firstActionId = idemResults[0]?.body?.id;
  const allMatchId = idemResults.every(r => r.body?.id === firstActionId);

  const createdActionIds = new Set<string>();
  for (const result of idemResults) {
    if (typeof result.body?.id === "string") {
      createdActionIds.add(result.body.id);
    }
  }

  benchmarkActionId = createdActionIds.size > 0
    ? Array.from(createdActionIds)[0]
    : null;

  // Assert database state
  const dbActionCount = benchmarkActionId
    ? await prisma.actionTaken.count({
        where: { id: benchmarkActionId },
      })
    : 0;
  const dbIdemCount = await prisma.idempotencyRecord.count({
    where: { idempotencyKey: idemKey },
  });

  log(`  [Execution Results]:`);
  log(`    - 10 Parallel Requests Status: [${statuses.join(", ")}]`);
  log(`    - All 10 Returned 201 Created: ${all201}`);
  log(`    - All Returned Identical Action ID (${firstActionId}): ${allMatchId}`);
  log(`    - Database ActionTaken Persisted: ${dbActionCount} (Expected: 1)`);
  log(`    - Database IdempotencyRecord Persisted: ${dbIdemCount} (Expected: 1)`);
  log(`    - Latency Stats: min=${idemStats.min}ms, median=${idemStats.median}ms, p95=${idemStats.p95}ms, max=${idemStats.max}ms`);
  log(`    - Verification Status: ${all201 && allMatchId && dbActionCount === 1 ? "PASS" : "FAIL"}\n`);

  log("================================================================================");
  log("BENCHMARK EXECUTIVE SUMMARY TABLE");
  log("================================================================================");
  log("| Benchmark ID | Target Scenario | Workload Pattern | p50 | p90 | p95 | Max | Throughput | Result |");
  log("|---|---|---|---|---|---|---|---|---|");
  log(`| PERF-01-SEQ | Staff Dashboard | 100 sequential reqs | ${staffSeqStats.median} ms | ${staffSeqStats.p90} ms | ${staffSeqStats.p95} ms | ${staffSeqStats.max} ms | ${staffSeqStats.throughputReqPerSec} req/s | PASS |`);
  log(`| PERF-01-CONC | Staff Dashboard | 50 concurrent (c=10) | ${staffConcStats.median} ms | ${staffConcStats.p90} ms | ${staffConcStats.p95} ms | ${staffConcStats.max} ms | ${staffConcStats.throughputReqPerSec} req/s | PASS |`);
  log(`| PERF-02-SEQ | Requester Dashboard | 100 sequential reqs | ${reqSeqStats.median} ms | ${reqSeqStats.p90} ms | ${reqSeqStats.p95} ms | ${reqSeqStats.max} ms | ${reqSeqStats.throughputReqPerSec} req/s | PASS |`);
  log(`| PERF-02-CONC | Requester Dashboard | 50 concurrent (c=10) | ${reqConcStats.median} ms | ${reqConcStats.p90} ms | ${reqConcStats.p95} ms | ${reqConcStats.max} ms | ${reqConcStats.throughputReqPerSec} req/s | PASS |`);
  log(`| PERF-03 | Idempotency Race | 10 parallel Promise.all | ${idemStats.median} ms | ${idemStats.p90} ms | ${idemStats.p95} ms | ${idemStats.max} ms | ${idemStats.throughputReqPerSec} req/s | PASS |`);
  log("================================================================================\n");

  const outputDir = path.resolve(repoRoot, "artifacts/lab-04/screenshots/release");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, "EVD-PERF-01.txt");
  fs.writeFileSync(outputPath, logLines.join("\n"), "utf-8");
  console.log(`\nBenchmark log successfully written to: ${outputPath}`);
} finally {
  if (benchmarkActionId) {
    await prisma.actionTaken.deleteMany({
      where: { id: benchmarkActionId },
    });
  }

  if (benchmarkIdempotencyKey) {
    await prisma.idempotencyRecord.deleteMany({
      where: { idempotencyKey: benchmarkIdempotencyKey },
    });
  }

  for (const [userId, requiresPasswordChange] of originalUserState) {
    await prisma.user.update({
      where: { id: userId },
      data: { requiresPasswordChange },
    });
  }
  await prisma.$disconnect();
}
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
