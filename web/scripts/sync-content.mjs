import { execFile as execFileCallback } from "node:child_process";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { parseDocument, shouldIncludeDocument } from "./content.mjs";

const execFile = promisify(execFileCallback);
const REPOSITORY = "jaywapp/wiki";
const BRANCH = "develop";
const REMOTE_URL = `https://github.com/${REPOSITORY}.git`;
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
const CACHE_DIRECTORY = path.join(WEB_DIRECTORY, ".content-cache");
const REPOSITORY_DIRECTORY = path.join(CACHE_DIRECTORY, "repository");
const OUTPUT_FILE = path.join(WEB_DIRECTORY, "public", "content.json");
const MAX_BUFFER = 64 * 1024 * 1024;

async function runGit(args, options = {}) {
  const { stdout } = await execFile("git", args, {
    cwd: options.cwd ?? WEB_DIRECTORY,
    encoding: options.encoding ?? "utf8",
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
  });
  return stdout;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function safeTemporaryRepositoryPath(target) {
  const resolvedCache = path.resolve(CACHE_DIRECTORY);
  const resolvedTarget = path.resolve(target);
  if (
    path.dirname(resolvedTarget) !== resolvedCache ||
    !path.basename(resolvedTarget).startsWith("repository-clone-")
  ) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

async function prepareRepository() {
  await mkdir(CACHE_DIRECTORY, { recursive: true });

  if (!(await exists(path.join(REPOSITORY_DIRECTORY, ".git")))) {
    if (await exists(REPOSITORY_DIRECTORY)) {
      throw new Error(`Content cache exists but is not a Git repository: ${REPOSITORY_DIRECTORY}`);
    }
    const temporaryRepository = safeTemporaryRepositoryPath(
      path.join(CACHE_DIRECTORY, `repository-clone-${process.pid}`)
    );
    try {
      await runGit([
        "clone",
        "--no-checkout",
        "--single-branch",
        "--branch",
        BRANCH,
        REMOTE_URL,
        temporaryRepository,
      ]);
      await rename(temporaryRepository, REPOSITORY_DIRECTORY);
    } catch (error) {
      await rm(safeTemporaryRepositoryPath(temporaryRepository), { recursive: true, force: true });
      throw error;
    }
  }

  const configuredRemote = (await runGit(["remote", "get-url", "origin"], { cwd: REPOSITORY_DIRECTORY })).trim();
  if (configuredRemote !== REMOTE_URL) {
    throw new Error(`Unexpected content cache origin: ${configuredRemote}`);
  }

  await runGit(["fetch", "--prune", "origin", BRANCH], { cwd: REPOSITORY_DIRECTORY });
  return (await runGit(["rev-parse", "--verify", "FETCH_HEAD^{commit}"], { cwd: REPOSITORY_DIRECTORY })).trim();
}

async function trackedMarkdownFiles(commit) {
  const stdout = await runGit(["ls-tree", "-r", "--name-only", "-z", commit], {
    cwd: REPOSITORY_DIRECTORY,
    encoding: "buffer",
  });
  return stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter(shouldIncludeDocument)
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function readDocument(commit, filePath) {
  const [markdown, gitTimestamp] = await Promise.all([
    runGit(["show", `${commit}:${filePath}`], { cwd: REPOSITORY_DIRECTORY }),
    runGit(["log", "-1", "--format=%cI", commit, "--", filePath], { cwd: REPOSITORY_DIRECTORY }),
  ]);

  return parseDocument({
    filePath,
    markdown,
    gitTimestamp: gitTimestamp.trim(),
    commit,
    repository: REPOSITORY,
    branch: BRANCH,
  });
}

async function main() {
  const commit = await prepareRepository();
  const files = await trackedMarkdownFiles(commit);
  if (files.length === 0) throw new Error(`No public Markdown documents found at ${commit}`);

  const documents = [];
  for (const filePath of files) documents.push(await readDocument(commit, filePath));

  const payload = {
    repository: REPOSITORY,
    branch: BRANCH,
    commit,
    generatedAt: new Date().toISOString(),
    documents,
  };
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Indexed ${documents.length} documents from ${REPOSITORY}@${commit}.`);
}

main().catch((error) => {
  console.error(`Content sync failed: ${error.message}`);
  process.exitCode = 1;
});
