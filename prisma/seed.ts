import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("Admin@1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@codereview.dev" },
    update: {},
    create: {
      email: "admin@codereview.dev",
      passwordHash: adminPasswordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log(`  ✅ Admin user: ${admin.email} (id: ${admin.id})`);

  // Create demo user
  const userPasswordHash = await bcrypt.hash("User@1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@codereview.dev" },
    update: {},
    create: {
      email: "demo@codereview.dev",
      passwordHash: userPasswordHash,
      name: "Demo User",
      role: "USER",
    },
  });
  console.log(`  ✅ Demo user: ${user.email} (id: ${user.id})`);

  // Create sample repository
  const repo = await prisma.repository.upsert({
    where: {
      userId_url: {
        userId: user.id,
        url: "https://github.com/example/sample-project",
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: "sample-project",
      url: "https://github.com/example/sample-project",
      branch: "main",
      language: "typescript",
    },
  });
  console.log(`  ✅ Sample repository: ${repo.name} (id: ${repo.id})`);

  // Create sample completed analysis
  const analysis = await prisma.analysis.create({
    data: {
      userId: user.id,
      repositoryId: repo.id,
      status: "COMPLETED",
      triggerType: "MANUAL",
      language: "typescript",
      fileName: "example.ts",
      sourceCode: 'function add(a: number, b: number): number { return a + b; }',
      overallScore: 92,
      qualityScore: 95,
      securityScore: 100,
      complexityScore: 85,
      processingTimeMs: 1234,
      startedAt: new Date(Date.now() - 2000),
      completedAt: new Date(),
      resultJson: {
        analysis_metadata: {
          engine_version: "1.0",
          analysis_type: "deep_semantic_review",
          confidence_score: 0.92,
        },
        logical_errors: [],
        edge_case_risks: [],
        architectural_weaknesses: [],
        security_risks: [],
        performance_risks: [],
        concurrency_risks: [],
        data_flow_risks: [],
        production_hardening_gaps: [],
        refactoring_recommendations: [],
        executive_summary: "Clean, well-typed utility function with minimal complexity.",
      },
    },
  });
  console.log(`  ✅ Sample analysis: ${analysis.id}`);

  // Create sample findings
  await prisma.finding.createMany({
    data: [
      {
        analysisId: analysis.id,
        category: "EDGE_CASE",
        severity: "LOW",
        title: "No overflow check for numeric addition",
        description: "The function does not guard against numeric overflow for very large values.",
        technicalExplanation: "JavaScript numbers are IEEE-754 doubles. Adding two large numbers may result in Infinity.",
        recommendedFix: "Add runtime checks or use BigInt for critical calculations.",
        lineNumber: 1,
        confidenceScore: 0.75,
      },
      {
        analysisId: analysis.id,
        category: "REFACTORING",
        severity: "INFO",
        title: "Consider using a generic math utility",
        description: "For a production codebase, math operations are often better served by a tested utility library.",
        technicalExplanation: "Centralizing math operations improves testability and reduces duplication.",
        recommendedFix: "Create a math utilities module.",
        confidenceScore: 0.6,
      },
    ],
  });
  console.log("  ✅ Sample findings created");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Default credentials:");
  console.log("  Admin: admin@codereview.dev / Admin@1234");
  console.log("  User:  demo@codereview.dev / User@1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
