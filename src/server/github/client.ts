import { Octokit } from "octokit";
import { env } from "~/env";
import { type IssueDraft } from "~/server/ai/providers/types";

export interface GitHubRepo {
  owner: string;
  name: string;
}

export interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

export function createGitHubClient(): Octokit {
  if (!env.GITHUB_TOKEN) {
    throw new Error("GitHub token not configured");
  }
  
  return new Octokit({
    auth: env.GITHUB_TOKEN,
  });
}

export function isGitHubConfigured(): boolean {
  return !!env.GITHUB_TOKEN;
}

export async function createIssues(
  repo: GitHubRepo,
  issues: IssueDraft[]
): Promise<CreatedIssue[]> {
  const github = createGitHubClient();
  const createdIssues: CreatedIssue[] = [];

  for (const issue of issues) {
    try {
      const { data } = await github.rest.issues.create({
        owner: repo.owner,
        repo: repo.name,
        title: issue.title,
        body: issue.body,
        labels: issue.labels ?? [],
      });

      createdIssues.push({
        number: data.number,
        url: data.html_url,
        title: data.title,
      });
    } catch (error) {
      console.error(`Failed to create issue "${issue.title}":`, error);
      // Continue creating other issues even if one fails
    }
  }

  return createdIssues;
}

export async function getRecentIssues(
  repo: GitHubRepo,
  since?: Date,
  limit = 20
): Promise<Array<{
  number: number;
  title: string;
  url: string;
  createdAt: string;
  state: string;
}>> {
  const github = createGitHubClient();
  
  try {
    const { data } = await github.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.name,
      state: "all",
      sort: "created",
      direction: "desc",
      per_page: limit,
      since: since?.toISOString(),
    });

    return data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      createdAt: issue.created_at,
      state: issue.state,
    }));
  } catch (error) {
    console.error("Failed to fetch recent issues:", error);
    throw new Error("Failed to fetch recent issues from GitHub");
  }
}

export async function validateRepoAccess(repo: GitHubRepo): Promise<boolean> {
  const github = createGitHubClient();
  
  try {
    await github.rest.repos.get({
      owner: repo.owner,
      repo: repo.name,
    });
    return true;
  } catch (error) {
    console.error(`Failed to access repo ${repo.owner}/${repo.name}:`, error);
    return false;
  }
}