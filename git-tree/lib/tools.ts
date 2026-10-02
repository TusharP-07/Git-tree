import { tool } from "ai";
import { z } from "zod";
import { fetchRepoTree, fetchFileContent } from "./github";

export async function executeListFiles(owner: string, repo: string, path: string, accessToken?: string) {
  try {
    const { tree } = await fetchRepoTree(owner, repo, accessToken);
    
    // Normalize path to not have trailing slashes, except empty string
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const prefix = normalizedPath ? `${normalizedPath}/` : "";
    
    // Find all files/folders that are direct children of this path
    const children = new Set<string>();
    
    for (const item of tree) {
      if (item.path.startsWith(prefix)) {
        const remaining = item.path.slice(prefix.length);
        const nextSlashIndex = remaining.indexOf("/");
        
        if (nextSlashIndex === -1) {
          // Direct child
          children.add(item.path);
        } else {
          // It's a directory, add the directory name
          const dirName = prefix + remaining.slice(0, nextSlashIndex);
          children.add(dirName + "/");
        }
      }
    }
    
    const result = Array.from(children).sort();
    return result.length > 0 ? result : ["(Empty directory or path not found)"];
  } catch (err) {
    return [(err as Error).message];
  }
}

export function getChatTools(owner: string, repo: string, accessToken?: string) {
  return {
    listFiles: tool({
      description: "List the files and directories inside a specific path of the repository. Use this to explore the repository structure before reading specific files.",
      parameters: z.object({
        path: z.string().describe("The directory path to list files for. Use an empty string '' for the root directory of the repository."),
      }),
      // @ts-expect-error
      execute: async ({ path }: { path: string }) => await executeListFiles(owner, repo, path, accessToken),
    }),
    getFileContent: tool({
      description: "Get the raw text content of a specific file in the repository. Use this to read the code or documentation inside a file.",
      parameters: z.object({
        path: z.string().describe("The exact file path to fetch the content for (e.g., 'src/index.ts')."),
      }),
      // @ts-expect-error
      execute: async ({ path }: { path: string }) => {
        try {
          return await fetchFileContent(owner, repo, path, accessToken);
        } catch (err) {
          return `Error fetching file: ${(err as Error).message}`;
        }
      },
    }),
  };
}
