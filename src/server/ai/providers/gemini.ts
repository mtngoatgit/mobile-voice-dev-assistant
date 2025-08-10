import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";
import { type AIProvider, type PlanIssuesInput, type Plan, PlanSchema } from "./types";

export class GeminiProvider implements AIProvider {
  id = "gemini" as const;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GOOGLE_API_KEY) {
      this.client = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async planIssues(input: PlanIssuesInput): Promise<Plan> {
    if (!this.client) {
      throw new Error("Google API key not configured");
    }

    const model = this.client.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Latest and most efficient model
    });

    const systemPrompt = this.buildSystemPrompt(input.repo);
    const userPrompt = this.buildUserPrompt(input.transcript, input.branchContext);

    try {
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      // Extract JSON from response (Gemini sometimes includes extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Gemini response");
      }

      // Parse and validate the response
      const planData = JSON.parse(jsonMatch[0]);
      const validatedPlan = PlanSchema.parse(planData);

      return validatedPlan;
    } catch (error) {
      console.error("Gemini API error:", error);
      if (error instanceof Error) {
        throw new Error(`Gemini planning failed: ${error.message}`);
      }
      throw new Error("Gemini planning failed with unknown error");
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
You must respond with ONLY valid JSON matching this exact schema:
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
    
    prompt += `\n\nRespond with ONLY the JSON object, no additional text.`;
    
    return prompt;
  }
}