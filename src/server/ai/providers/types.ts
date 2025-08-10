import { z } from "zod";

// Zod schemas for validation
export const IssueDraftSchema = z.object({
  title: z.string().min(6),
  body: z.string().min(20),
  labels: z.array(z.string()).optional(),
});

export const PlanSchema = z.object({
  summary: z.string(),
  rationale: z.string(),
  issues: z.array(IssueDraftSchema).min(1),
});

// TypeScript types
export type IssueDraft = z.infer<typeof IssueDraftSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export interface PlanIssuesInput {
  transcript: string;
  repo: {
    owner: string;
    name: string;
  };
  branchContext?: string;
}

export interface AIProvider {
  id: "claude" | "openai" | "gemini";
  planIssues(input: PlanIssuesInput): Promise<Plan>;
  isConfigured(): boolean;
}

export type AIProviderType = AIProvider["id"];