const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?$/;
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

export function isValidRepository(owner: string, repo: string): boolean {
  return GITHUB_OWNER_PATTERN.test(owner) && GITHUB_REPO_PATTERN.test(repo);
}

export function isSafeRepositoryPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 500 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}
