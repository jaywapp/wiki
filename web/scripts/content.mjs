import path from "node:path";

import YAML from "yaml";

const MARKDOWN_EXTENSION = /\.(?:md|markdown)$/i;
const EXCLUDED_FILE = /^(?:AGENTS|CLAUDE)\.md$/i;
const SENSITIVE_SEGMENT = /^(?:\.env(?:\..*)?|secrets?|credentials?|private[-_]?keys?|tokens?)(?:\.(?:md|markdown))?$/i;

function normalizedPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function shouldIncludeDocument(filePath) {
  const normalized = normalizedPath(filePath);
  const segments = normalized.split("/").filter(Boolean);
  const lowerSegments = segments.map((segment) => segment.toLowerCase());

  if (!MARKDOWN_EXTENSION.test(normalized) || segments.length === 0) return false;
  if (EXCLUDED_FILE.test(segments.at(-1))) return false;
  if (segments.some((segment) => segment.startsWith("."))) return false;
  if (lowerSegments.includes("node_modules")) return false;
  if (lowerSegments[0] === "web") return false;
  if (lowerSegments[0] === "docs" && lowerSegments[1] === "ux-concepts") return false;
  if (segments.some((segment) => SENSITIVE_SEGMENT.test(segment))) return false;

  return true;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)/);
  if (!match) return { attributes: {}, body: markdown };

  const parsed = YAML.parse(match[1]);
  const attributes = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  return { attributes, body: markdown.slice(match[0].length) };
}

function cleanInlineMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<https?:\/\/[^>]+>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_~]+/g, "")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function markdownToPlainText(markdown) {
  const { body } = parseFrontmatter(markdown);
  return cleanInlineMarkdown(
    body
      .replace(/^```[^\r\n]*\r?\n?/gm, "")
      .replace(/^~~~[^\r\n]*\r?\n?/gm, "")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s*[-+*]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)*\s*\|?\s*$/gm, " ")
      .replace(/\|/g, " ")
  );
}

function firstHeading(body) {
  const match = body.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m);
  return match ? cleanInlineMarkdown(match[1]) : "";
}

function fallbackTitle(filePath) {
  const extension = path.posix.extname(filePath);
  return path.posix.basename(filePath, extension).replace(/[-_]+/g, " ").trim();
}

function normalizeTags(value) {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
}

function fallbackCategory(filePath) {
  const directory = path.posix.dirname(filePath);
  return directory === "." ? "root" : path.posix.basename(directory);
}

function validDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export function selectUpdated(gitTimestamp, frontmatterUpdated) {
  return validDate(gitTimestamp) ?? validDate(frontmatterUpdated);
}

function firstMeaningfulSentence(body, fallback) {
  const paragraphs = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/^\s{0,3}#{1,6}\s+.*$/gm, " "))
    .map((paragraph) => paragraph.replace(/^\s{0,3}>\s?/gm, " ").replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+/gm, " "))
    .map(cleanInlineMarkdown)
    .filter((paragraph) => paragraph && !/^[-=:|\s]+$/.test(paragraph));

  const paragraph = paragraphs[0];
  if (!paragraph) return fallback;
  const sentence = paragraph.match(/^.*?(?:[.!?](?=\s|$)|[。！？]|$)/)?.[0]?.trim();
  return sentence || paragraph;
}

export function parseDocument({ filePath, markdown, gitTimestamp, commit, repository, branch }) {
  const normalized = normalizedPath(filePath);
  const { attributes, body } = parseFrontmatter(markdown);
  const title =
    (typeof attributes.title === "string" && attributes.title.trim()) ||
    firstHeading(body) ||
    fallbackTitle(normalized);
  const category =
    (typeof attributes.category === "string" && attributes.category.trim()) ||
    fallbackCategory(normalized);
  const updated = selectUpdated(gitTimestamp, attributes.updated);
  if (!updated) throw new Error(`No valid Git or frontmatter date for ${normalized}`);

  const encodedPath = normalized.split("/").map(encodeURIComponent).join("/");
  return {
    id: normalized,
    path: normalized,
    title,
    category,
    tags: normalizeTags(attributes.tags),
    updated,
    markdown: body,
    text: markdownToPlainText(markdown),
    description: firstMeaningfulSentence(body, title),
    sourceUrl: `https://github.com/${repository}/blob/${commit}/${encodedPath}`,
  };
}
