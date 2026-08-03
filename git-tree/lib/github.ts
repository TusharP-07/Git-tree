import type { GitTreeItem } from "@/types";
import { isSafeRepositoryPath, isValidRepository } from "@/lib/validation";

const GITHUB_API = "https://api.github.com";

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const trimmed = url.trim();
    const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    const parsed = sshMatch
      ? { owner: sshMatch[1], repo: sshMatch[2] }
      : (() => {
          const parsedUrl = new URL(trimmed);
          if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") return null;
          const segments = parsedUrl.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
          return segments.length === 2 ? { owner: segments[0], repo: segments[1] } : null;
        })();

    return parsed && isValidRepository(parsed.owner, parsed.repo) ? parsed : null;
  } catch {
    return null;
  }
}

function repositoryUrl(owner: string, repo: string): string {
  if (!isValidRepository(owner, repo)) throw new Error("Invalid repository identifier");
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function contentPath(path: string): string {
  if (!isSafeRepositoryPath(path)) throw new Error("Invalid repository path");
  return path.split("/").map(encodeURIComponent).join("/");
}

export interface RepositoryTreeResult {
  tree: GitTreeItem[];
  truncated: boolean;
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<RepositoryTreeResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const repoUrl = repositoryUrl(owner, repo);
  const repoRes = await fetch(repoUrl, { headers, cache: "no-store" });
  if (!repoRes.ok) {
    throw new Error(`Repository not found or inaccessible (${repoRes.status})`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  const treeRes = await fetch(
    `${repoUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers, cache: "no-store" }
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repository tree (${treeRes.status})`);
  }
  const treeData = await treeRes.json();

  return { tree: treeData.tree as GitTreeItem[], truncated: Boolean(treeData.truncated) };
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
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `${repositoryUrl(owner, repo)}/contents/${contentPath(path)}`,
    { headers, cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch file content (${res.status})`);
  }

  return res.text();
}
