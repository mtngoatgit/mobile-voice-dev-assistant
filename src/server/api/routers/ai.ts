import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getProvider, getAvailableProviders, type AIProviderType } from "~/server/ai/providers";
import { createIssues, getRecentIssues, validateRepoAccess, isGitHubConfigured } from "~/server/github/client";

const planAndOpenIssuesInput = z.object({
  transcript: z.string().min(5),
  model: z.enum(["claude", "openai", "gemini"]),
  repo: z.object({
    owner: z.string(),
    name: z.string(),
  }),
  verbosity: z.enum(["brief", "verbose"]),
  labels: z.array(z.string()).optional(),
  branchContext: z.string().optional(),
});

export const aiRouter = createTRPCRouter({
  planAndOpenIssues: protectedProcedure
    .input(planAndOpenIssuesInput)
    .mutation(async ({ input, ctx }) => {
      // Get the AI provider
      const provider = getProvider(input.model);
      
      if (!provider.isConfigured()) {
        throw new Error(`${input.model} provider is not configured. Please add API keys to environment variables.`);
      }

      if (!isGitHubConfigured()) {
        throw new Error("GitHub integration is not configured. Please add GITHUB_TOKEN to environment variables.");
      }

      // Validate repository access
      const hasAccess = await validateRepoAccess(input.repo);
      if (!hasAccess) {
        throw new Error(`Cannot access repository ${input.repo.owner}/${input.repo.name}. Check repository exists and token has proper permissions.`);
      }

      // Generate the plan
      const plan = await provider.planIssues({
        transcript: input.transcript,
        repo: input.repo,
        branchContext: input.branchContext,
      });

      // Add default labels if provided
      if (input.labels && input.labels.length > 0) {
        plan.issues.forEach((issue) => {
          issue.labels = [...(issue.labels ?? []), ...input.labels!];
        });
      }

      // Create GitHub issues
      const createdIssues = await createIssues(input.repo, plan.issues);

      // Store in database for history
      const session = await ctx.db.voiceSession.create({
        data: {
          userId: ctx.user.id,
        },
      });

      const transcript = await ctx.db.transcript.create({
        data: {
          sessionId: session.id,
          text: input.transcript,
        },
      });

      const voicePlan = await ctx.db.voicePlan.create({
        data: {
          sessionId: session.id,
          transcriptId: transcript.id,
          provider: input.model,
          planJson: JSON.stringify(plan),
          summary: plan.summary,
          rationale: plan.rationale,
          issueRefs: {
            create: createdIssues.map((issue) => ({
              repo: `${input.repo.owner}/${input.repo.name}`,
              issueNumber: issue.number,
              url: issue.url,
              title: issue.title,
            })),
          },
        },
      });

      return {
        planSummary: plan.summary,
        rationale: plan.rationale,
        createdIssues,
        planId: voicePlan.id,
        totalIssuesCreated: createdIssues.length,
      };
    }),

  dryRunPlan: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(5),
        model: z.enum(["claude", "openai", "gemini"]),
        repo: z.object({
          owner: z.string(),
          name: z.string(),
        }),
        branchContext: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get the AI provider
      const provider = getProvider(input.model);
      
      if (!provider.isConfigured()) {
        throw new Error(`${input.model} provider is not configured. Please add API keys to environment variables.`);
      }

      // Generate the plan without creating issues
      const plan = await provider.planIssues({
        transcript: input.transcript,
        repo: input.repo,
        branchContext: input.branchContext,
      });

      return {
        summary: plan.summary,
        rationale: plan.rationale,
        issues: plan.issues,
        totalIssues: plan.issues.length,
      };
    }),

  getProviderStatus: protectedProcedure.query(() => {
    return {
      providers: getAvailableProviders(),
      github: {
        id: "github" as const,
        isConfigured: isGitHubConfigured(),
      },
    };
  }),

  getRecentIssues: protectedProcedure
    .input(
      z.object({
        repo: z.object({
          owner: z.string(),
          name: z.string(),
        }),
        since: z.date().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      if (!isGitHubConfigured()) {
        throw new Error("GitHub integration is not configured.");
      }

      return await getRecentIssues(input.repo, input.since, input.limit);
    }),

  getSessionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const sessions = await ctx.db.voiceSession.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          transcripts: true,
          plans: {
            include: {
              issueRefs: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit,
        skip: input.offset,
      });

      return sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        transcripts: session.transcripts.map((t) => ({
          id: t.id,
          text: t.text,
          duration: t.duration,
        })),
        plans: session.plans.map((p) => ({
          id: p.id,
          provider: p.provider as AIProviderType,
          summary: p.summary,
          rationale: p.rationale,
          issues: JSON.parse(p.planJson) as { issues: Array<{ title: string; body: string; labels?: string[] }> },
          createdIssues: p.issueRefs.map((ref) => ({
            number: ref.issueNumber,
            url: ref.url,
            title: ref.title,
            repo: ref.repo,
          })),
        })),
      }));
    }),
});