import OpenAI from "openai";
import { env } from "~/env";
import { type AIProvider, type PlanIssuesInput, type Plan, PlanSchema } from "./types";

export class OpenAIProvider implements AIProvider {
  id = "openai" as const;
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async planIssues(input: PlanIssuesInput): Promise<Plan> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = this.buildSystemPrompt(input.repo);
    const userPrompt = this.buildUserPrompt(input.transcript, input.branchContext);

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini", // Using the latest and most cost-effective model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent planning
        response_format: { type: "json_object" },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      // Parse and validate the response
      const planData = JSON.parse(responseContent);
      const validatedPlan = PlanSchema.parse(planData);

      return validatedPlan;
    } catch (error) {
      console.error("OpenAI API error:", error);
      if (error instanceof Error) {
        throw new Error(`OpenAI planning failed: ${error.message}`);
      }
      throw new Error("OpenAI planning failed with unknown error");
    }
  }

  private buildSystemPrompt(repo: { owner: string; name: string }): string {
    return `You are a senior product/engineering lead who converts spoken feature requests into actionable GitHub issues for the repository ${repo.owner}/${repo.name}.

Your task is to:
1. Parse the spoken transcript and identify distinct feature requests/tasks
2. Break them down into concrete, actionable GitHub issues
3. Write clear titles and detailed descriptions with acceptance criteria
4. Suggest appropriate labels
5. Provide a summary and rationale for your plan

CRITICAL REQUIREMENTS:
- Each issue must have a clear, actionable title (minimum 6 characters)
- Each issue body must be detailed with acceptance criteria (minimum 20 characters)
- Focus on small, vertical slices that can be implemented independently
- Use technical language appropriate for developers
- Include implementation notes and potential technical considerations

RESPONSE FORMAT:
You must respond with valid JSON matching this exact schema:
{
  "summary": "Brief overview of what will be implemented",
  "rationale": "Why this breakdown makes sense",
  "issues": [
    {
      "title": "Clear, actionable issue title",
      "body": "## Context\\n[What this is about]\\n\\n## Acceptance Criteria\\n- [ ] Specific requirement 1\\n- [ ] Specific requirement 2\\n\\n## Technical Notes\\n[Implementation details]",
      "labels": ["feature", "enhancement"]
    }
  ]
}

Example labels to consider: feature, enhancement, bug, documentation, ui/ux, backend, frontend, mobile, api`;
  }

  private buildUserPrompt(transcript: string, branchContext?: string): string {
    let prompt = `Please convert this spoken feature request into GitHub issues:\n\n"${transcript}"`;
    
    if (branchContext) {
      prompt += `\n\nCurrent branch/context: ${branchContext}`;
    }
    
    prompt += `\n\nRemember to respond with valid JSON matching the required schema.`;
    
    return prompt;
  }
}