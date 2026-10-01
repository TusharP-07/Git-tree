import type { GitTreeItem } from "@/types";
import { isSafeRepositoryPath, isValidRepository } from "@/lib/validation";

const GITHUB_API = "https://api.github.com";
const PUBLIC_REVALIDATE_SECONDS = 300;

function githubFetchOptions(headers: Record<string, string>, accessToken?: string): RequestInit {
  // Authenticated responses are user-specific and must not enter the shared data cache.
  if (accessToken) return { headers, cache: "no-store" };

  // Public repository data is safe to reuse briefly. This keeps view changes from
  // repeatedly consuming GitHub's low unauthenticated API allowance.
  return { headers, next: { revalidate: PUBLIC_REVALIDATE_SECONDS } };
}

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

import { redis } from "./redis";

export interface RepositoryTreeResult {
  tree: GitTreeItem[];
  truncated: boolean;
}

const REDIS_CACHE_TTL = 3600; // 1 hour

export async function fetchRepoTree(
  owner: string,
  repo: string,
  accessToken?: string
): Promise<RepositoryTreeResult> {
  const cacheKey = `repo-tree:${owner}:${repo}`;
  
  if (redis && !accessToken) {
    try {
      const cached = await redis.get<RepositoryTreeResult>(cacheKey);
      if (cached) return cached;
    } catch (e) {
      console.warn("Redis get error:", e);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const repoUrl = repositoryUrl(owner, repo);
  const fetchOptions = githubFetchOptions(headers, accessToken);
  const repoRes = await fetch(repoUrl, fetchOptions);
  if (!repoRes.ok) {
    throw new Error(`Repository not found or inaccessible (${repoRes.status})`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  const treeRes = await fetch(
    `${repoUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    fetchOptions
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repository tree (${treeRes.status})`);
  }
  const treeData = await treeRes.json();

  const result = { tree: treeData.tree as GitTreeItem[], truncated: Boolean(treeData.truncated) };

  if (redis && !accessToken) {
    try {
      await redis.setex(cacheKey, REDIS_CACHE_TTL, JSON.stringify(result));
    } catch (e) {
      console.warn("Redis set error:", e);
    }
  }

  return result;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken?: string
): Promise<string> {
  const cacheKey = `file-content:${owner}:${repo}:${path}`;

  if (redis && !accessToken) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) return cached;
    } catch (e) {
      console.warn("Redis get error:", e);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `${repositoryUrl(owner, repo)}/contents/${contentPath(path)}`,
    githubFetchOptions(headers, accessToken)
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch file content (${res.status})`);
  }

  const text = await res.text();

  if (redis && !accessToken) {
    try {
      await redis.setex(cacheKey, REDIS_CACHE_TTL, text);
    } catch (e) {
      console.warn("Redis set error:", e);
    }
  }

  return text;
}
