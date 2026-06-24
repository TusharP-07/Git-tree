import type { GitTreeItem } from "@/types";

const GITHUB_API = "https://api.github.com";

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<GitTreeItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = accessToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`Repository not found or inaccessible (${repoRes.status})`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  const treeRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repository tree (${treeRes.status})`);
  }
  const treeData = await treeRes.json();

  if (treeData.truncated) {
    console.warn(`Tree for ${owner}/${repo} was truncated by GitHub API`);
  }

  return treeData.tree as GitTreeItem[];
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken?: string
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
  };
  const token = accessToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch file content (${res.status})`);
  }

  return res.text();
}