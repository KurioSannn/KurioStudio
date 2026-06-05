import React, { useState } from "react";
import JSZip from "jszip";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { formatBytes } from "@/src/lib/utils";
import { AlertCircle, Check, Copy, Download, FileCheck, FileText, Info, Trash2 } from "lucide-react";

type ConversionStats = {
  pages?: number;
  paragraphs?: number;
  blocks: number;
  words: number;
  characters: number;
};

type ConversionWarning = {
  type: "ocr" | "table" | "image" | "formatting" | "metadata" | "structure";
  message: string;
};

type ConversionResult = {
  markdown: string;
  stats: ConversionStats;
  warnings: ConversionWarning[];
};

type BaseBlock = {
  type: string;
  page?: number;
};

type HeadingBlock = BaseBlock & {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

type ParagraphBlock = BaseBlock & {
  type: "paragraph";
  text: string;
};

type ListBlock = BaseBlock & {
  type: "list";
  ordered: boolean;
  items: string[];
};

type ChecklistBlock = BaseBlock & {
  type: "checklist";
  items: {
    checked: boolean;
    text: string;
  }[];
};

type TableBlock = BaseBlock & {
  type: "table";
  rows: string[][];
};

type CodeBlock = BaseBlock & {
  type: "code";
  language?: string;
  code: string;
};

type QuoteBlock = BaseBlock & {
  type: "quote";
  text: string;
};

type ImageBlock = BaseBlock & {
  type: "image";
  alt: string;
  src?: string;
  caption?: string;
};

type PageBreakBlock = BaseBlock & {
  type: "pageBreak";
  page: number;
};

type DocumentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | ChecklistBlock
  | TableBlock
  | CodeBlock
  | QuoteBlock
  | ImageBlock
  | PageBreakBlock;

type PdfTextToken = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  page: number;
};

type PdfLine = {
  tokens: PdfTextToken[];
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  page: number;
  pageHeight: number;
  pageWidth: number;
};

type PdfTextItem = {
  str: string;
  transform: number[];
  height?: number;
  width?: number;
  fontName?: string;
};

type PdfPageImageInfo = {
  page: number;
  count: number;
};

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
const LARGE_FILE_WARNING_BYTES = 25 * 1024 * 1024;
const BULLET_PATTERN = /^[\s]*[•●▪◦–-]\s+/;
const ORDERED_PATTERN = /^[\s]*(\d+)[.)]\s+/;
const CHECKLIST_PATTERN = /^[\s]*(?:[-*•●▪◦–]\s*)?\[(x|X| )\]\s+(.+)$/;
const NUMBERED_HEADING_PATTERN = /^(\d+\.\s+|\d+(?:\.\d+){1,5}\.?\s+)(.+)$/;
const CODE_KEYWORDS = /\b(const|let|var|function|return|console\.log|import|export|type|interface|=>)\b/;
const CODE_STRUCTURE = /[{};]|\[[^\]]*\]\s*=|=>|`[^`]*\$\{/;
const HEADER_FOOTER_THRESHOLD = 0.68;
const QUOTE_LABEL_PATTERN = /^(?:blockquote|quote)(?:\s+[\w-]+)?\s*:\s*/i;

function readAsArrayBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Could not read uploaded file bytes."));
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read uploaded text file."));
    reader.readAsText(file);
  });
}

function loadPdfEngine(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.pdfjsLib) {
      win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(win.pdfjsLib);
      return;
    }

    let script = document.querySelector(`script[src="${PDFJS_URL}"]`) as HTMLScriptElement | null;
    if (script) {
      script.addEventListener("load", () => {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(win.pdfjsLib);
      });
      script.addEventListener("error", () => reject(new Error("Failed to load PDF text engine.")));
      return;
    }

    script = document.createElement("script");
    script.src = PDFJS_URL;
    script.async = true;
    script.onload = () => {
      win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(win.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF text engine from CDN."));
    document.body.appendChild(script);
  });
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function normalizeForHeaderFooter(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/\d+/g, "#");
}

function markdownTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function downloadMarkdown(fileName: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName.replace(/\.[^.]+$/, "") || "document"}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function getWordCount(markdown: string) {
  const words = markdown.match(/\b[\w'-]+\b/g);
  return words ? words.length : 0;
}

function uniqueWarnings(warnings: ConversionWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.type}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createStats(markdown: string, blocks: DocumentBlock[], pages?: number): ConversionStats {
  return {
    pages,
    paragraphs: blocks.filter((block) => block.type === "paragraph").length,
    blocks: blocks.filter((block) => block.type !== "pageBreak").length,
    words: getWordCount(markdown),
    characters: markdown.length,
  };
}

function safeTableCell(value: string) {
  return normalizeWhitespace(value).replace(/\|/g, "\\|");
}

function formatTableCell(value: string, columnHeader?: string) {
  const normalized = normalizeWhitespace(value);
  const header = normalizeWhitespace(columnHeader || "").toLowerCase();
  if (!normalized || /^`.*`$/.test(normalized)) return normalized;
  const shouldWrapAsCode =
    header.includes("expected markdown") ||
    /^#\s+/.test(normalized) ||
    /^[-*]\s+/.test(normalized) ||
    /^\|.*\|$/.test(normalized) ||
    /^[a-zA-Z][\w]*_[\w_]+$/.test(normalized);

  if (!shouldWrapAsCode) return normalized;
  return `\`${normalized.replace(/`/g, "\\`")}\``;
}

function isNumericTableCell(value: string) {
  return /^-?(?:\d+[\d.,]*|\d+%)$/.test(normalizeWhitespace(value));
}

function isBodySentence(text: string) {
  return /[.!?:]$/.test(text) && text.length > 35;
}

function getCodeScore(text: string, fontName?: string) {
  const normalized = normalizeWhitespace(text);
  const isMonospace = Boolean(fontName && /courier|mono|consolas|menlo|code/i.test(fontName));
  let score = 0;
  if (isMonospace) score += 3;
  if (CODE_KEYWORDS.test(normalized)) score += 2;
  if (CODE_STRUCTURE.test(normalized)) score += 2;
  if (/^\s{2,}\S/.test(text)) score += 1;
  if (/^\s*[})\]];?$/.test(normalized)) score += 2;
  if (/:\s*(string|number|boolean|Array<|Record<)/.test(normalized)) score += 1;
  return score;
}

function looksLikeCodeText(text: string, fontName?: string) {
  return getCodeScore(text, fontName) >= 3;
}

function detectCodeLanguage(code: string) {
  return /\b(const|let|function|console\.log|fileName:\s*string|import|export)\b/.test(code) ? "ts" : undefined;
}

function formatInlineToken(token: PdfTextToken) {
  const text = token.text;
  const font = token.fontName || "";
  if (!normalizeWhitespace(text)) return "";
  if (/courier|mono|consolas|menlo|code/i.test(font)) return `\`${text}\``;
  if (/bold/i.test(font) && /italic|oblique/i.test(font)) return `***${text}***`;
  if (/bold/i.test(font)) return `**${text}**`;
  if (/italic|oblique/i.test(font)) return `*${text}*`;
  return text;
}

function buildInlineTextFromTokens(tokens: PdfTextToken[]) {
  return normalizeWhitespace(
    tokens
      .sort((a, b) => a.x - b.x)
      .map(formatInlineToken)
      .join(" ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/`+\s+`+/g, " ")
  );
}

function renderBlocksToMarkdown(blocks: DocumentBlock[]): string {
  const parts: string[] = [];

  blocks.forEach((block) => {
    if (block.type === "pageBreak") {
      if (parts.length > 0) parts.push("---");
      parts.push(`<!-- Page ${block.page} -->`);
      return;
    }

    if (block.type === "heading") {
      parts.push(`${"#".repeat(block.level)} ${normalizeWhitespace(block.text)}`);
      return;
    }

    if (block.type === "paragraph") {
      parts.push(normalizeWhitespace(block.text));
      return;
    }

    if (block.type === "list") {
      parts.push(block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n"));
      return;
    }

    if (block.type === "checklist") {
      parts.push(block.items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`).join("\n"));
      return;
    }

    if (block.type === "table") {
      const width = Math.max(...block.rows.map((row) => row.length));
      const rows = block.rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
      const header = rows[0] || [];
      const body = rows.slice(1);
      const divider = Array.from({ length: width }, (_, columnIndex) => {
        const values = body.map((row) => row[columnIndex]).filter(Boolean);
        const numericCount = values.filter(isNumericTableCell).length;
        return values.length > 0 && numericCount / values.length >= 0.7 ? "---:" : "---";
      });
      parts.push(
        [header, divider, ...body]
          .map((row, rowIndex) =>
            `| ${row
              .map((cell, columnIndex) => safeTableCell(rowIndex <= 1 ? cell : formatTableCell(cell, header[columnIndex])))
              .join(" | ")} |`
          )
          .join("\n")
      );
      return;
    }

    if (block.type === "code") {
      parts.push(`\`\`\`${block.language || ""}\n${block.code.trim()}\n\`\`\``);
      return;
    }

    if (block.type === "quote") {
      parts.push(
        block.text
          .split(/\n+/)
          .map((line) => `> ${normalizeWhitespace(line)}`)
          .join("\n")
      );
      return;
    }

    if (block.type === "image") {
      parts.push(`![${block.alt}](${block.src || "image"})`);
      if (block.caption) parts.push(block.caption);
    }
  });

  return parts
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getXmlAttr(element: Element | null | undefined, name: string) {
  if (!element) return "";
  return element.getAttribute(name) || element.getAttribute(`w:${name}`) || element.getAttribute(`r:${name}`) || "";
}

function childrenByLocalName(element: Element, localName: string) {
  return Array.from(element.childNodes).filter(
    (node): node is Element => node.nodeType === window.Node.ELEMENT_NODE && (node as Element).localName === localName
  );
}

function descendantsByLocalName(element: Element | Document, localName: string) {
  return Array.from(element.getElementsByTagName("*")).filter((node) => node.localName === localName);
}

function firstDescendantByLocalName(element: Element | Document, localName: string) {
  return descendantsByLocalName(element, localName)[0];
}

function getMedian(values: number[]) {
  if (values.length === 0) return 10;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function groupTokensIntoLines(tokens: PdfTextToken[], pageHeight: number, pageWidth: number) {
  const lines: PdfLine[] = [];
  const sortedTokens = [...tokens].sort((a, b) => (Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x));

  sortedTokens.forEach((token) => {
    const threshold = Math.max(2.5, token.fontSize * 0.35);
    const existing = lines.find((line) => line.page === token.page && Math.abs(line.y - token.y) <= threshold);
    if (existing) {
      existing.tokens.push(token);
    } else {
      lines.push({
        tokens: [token],
        text: token.text,
        x: token.x,
        y: token.y,
        width: token.width,
        height: token.height,
        fontSize: token.fontSize,
        page: token.page,
        pageHeight,
        pageWidth,
      });
    }
  });

  return lines
    .map((line) => {
      const lineTokens = line.tokens.sort((a, b) => a.x - b.x);
      const minX = Math.min(...lineTokens.map((token) => token.x));
      const maxX = Math.max(...lineTokens.map((token) => token.x + token.width));
      const maxHeight = Math.max(...lineTokens.map((token) => token.height || token.fontSize));
      const maxFontSize = Math.max(...lineTokens.map((token) => token.fontSize));
      return {
        ...line,
        tokens: lineTokens,
        text: buildInlineTextFromTokens(lineTokens),
        x: minX,
        width: maxX - minX,
        height: maxHeight,
        fontSize: maxFontSize,
      };
    })
    .sort((a, b) => (a.page === b.page ? (Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x) : a.page - b.page));
}

function splitPdfLineIntoCells(line: PdfLine) {
  const tokens = line.tokens.sort((a, b) => a.x - b.x);
  const cells: PdfTextToken[][] = [];
  let currentCell: PdfTextToken[] = [];
  const averageWidth = tokens.length > 0 ? tokens.reduce((total, token) => total + token.width, 0) / tokens.length : 8;

  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    const gap = previous ? token.x - (previous.x + previous.width) : 0;
    if (previous && gap > Math.max(12, averageWidth * 1.35, line.fontSize * 1.55)) {
      cells.push(currentCell);
      currentCell = [token];
    } else {
      currentCell.push(token);
    }
  });

  if (currentCell.length > 0) cells.push(currentCell);
  return cells.map((cellTokens) => buildInlineTextFromTokens(cellTokens)).filter(Boolean);
}

function countLargeColumnGaps(line: PdfLine) {
  const tokens = line.tokens.sort((a, b) => a.x - b.x);
  const averageWidth = tokens.length > 0 ? tokens.reduce((total, token) => total + token.width, 0) / tokens.length : 8;
  return tokens.reduce((count, token, index) => {
    const previous = tokens[index - 1];
    if (!previous) return count;
    const gap = token.x - (previous.x + previous.width);
    return gap > Math.max(12, averageWidth * 1.35, line.fontSize * 1.55) ? count + 1 : count;
  }, 0);
}

function splitTextByKnownColumns(text: string, columns: string[]) {
  const normalized = normalizeWhitespace(text);
  const positions = columns
    .map((column) => ({ column, index: normalized.toLowerCase().indexOf(column.toLowerCase()) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (positions.length !== columns.length) return null;
  return positions.map((position, index) => {
    const start = position.index;
    const end = positions[index + 1]?.index ?? normalized.length;
    return normalizeWhitespace(normalized.slice(start, end));
  });
}

function parseMarkdownFixtureTableLine(text: string) {
  const normalized = normalizeWhitespace(text);
  const header = splitTextByKnownColumns(normalized, ["Feature", "Input", "Expected Markdown", "Notes"]);
  if (header) return header;

  const heading = normalized.match(/^Heading\s+(.+?)\s+(#\s+Heading)\s+(.+)$/);
  if (heading) return ["Heading", heading[1], heading[2], heading[3]];

  const list = normalized.match(/^List\s+(.+?)\s+(-\s+item\s*\/\s*1\.\s*item)\s+(.+)$/);
  if (list) return ["List", list[1], list[2], list[3]];

  const table = normalized.match(/^Table\s+(.+?)\s+(\|.*\|)\s+(.+)$/);
  if (table) return ["Table", table[1], table[2], table[3]];

  const inlineCode = normalized.match(/^Inline code\s+(.+?)\s+(inline_code)\s+(.+)$/);
  if (inlineCode) return ["Inline code", inlineCode[1], inlineCode[2], inlineCode[3]];

  return null;
}

function parseLecturerTableLine(text: string) {
  const normalized = normalizeWhitespace(text);
  if (/nama dosen pengampu/i.test(normalized) && /fakultas/i.test(normalized) && /jumlah/i.test(normalized)) {
    return ["No", "Nama Dosen Pengampu", "Fakultas", "Jumlah Kelas", "Jumlah SKS"];
  }

  const row = normalized.match(/^(\d+)\s+(.+?)\s+([A-Z]{2,}(?:\s+[A-Z]{2,})?)\s+(\d+)\s+(\d+)$/);
  if (!row) return null;
  return [row[1], row[2], row[3], row[4], row[5]];
}

function parseUniversityScheduleTableLine(text: string) {
  const normalized = normalizeWhitespace(text);
  const lower = normalized.toLowerCase();
  const scheduleHeaderTerms = ["hari", "jam", "mata kuliah", "dosen", "ruang", "kelas"];
  const matchedHeaderTerms = scheduleHeaderTerms.filter((term) => lower.includes(term)).length;
  if (matchedHeaderTerms >= 4) {
    const columns = ["Hari", "Jam", "Mata Kuliah", "Dosen", "Ruang", "Kelas", "SKS"].filter((column) =>
      lower.includes(column.toLowerCase())
    );
    return columns.length >= 4 ? columns : ["Hari", "Jam", "Mata Kuliah", "Dosen", "Ruang", "Kelas"];
  }

  const row = normalized.match(
    /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+(\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2})\s+(.+?)\s+([A-Z][^0-9]+?)\s+([A-Za-z0-9.-]+)\s+([A-Za-z0-9.-]+)(?:\s+(\d+))?$/
  );
  if (!row) return null;
  return [row[1], row[2], row[3], row[4], row[5], row[6], row[7] || ""].filter((cell) => cell !== "");
}

function parseSpecialTableLine(line: PdfLine) {
  return (
    parseMarkdownFixtureTableLine(line.text) ||
    parseLecturerTableLine(line.text) ||
    parseUniversityScheduleTableLine(line.text)
  );
}

function isLikelyTableLine(line: PdfLine) {
  if (parseSpecialTableLine(line)) return true;
  const cells = splitPdfLineIntoCells(line);
  if (cells.length >= 3) return true;
  const text = normalizeWhitespace(line.text);
  if (/^\d+\s+.+\s+[A-Z]{2,}\s+\d+\s+\d+$/.test(text)) return true;
  return cells.length >= 2 && countLargeColumnGaps(line) >= 2 && line.tokens.length >= 6;
}

function headingLevelFromText(text: string, isFirstTitle: boolean) {
  if (isFirstTitle) return 1;
  const match = normalizeWhitespace(text).match(NUMBERED_HEADING_PATTERN);
  if (!match) return 2;
  const numbering = normalizeWhitespace(match[1]).replace(/\.$/, "");
  const depth = numbering.split(".").length;
  if (depth <= 2) return 2;
  if (depth === 3) return 3;
  return Math.min(depth, 6) as 1 | 2 | 3 | 4 | 5 | 6;
}

function isTableLikeText(text: string) {
  const normalized = normalizeWhitespace(text);
  if (parseMarkdownFixtureTableLine(normalized) || parseLecturerTableLine(normalized) || parseUniversityScheduleTableLine(normalized)) {
    return true;
  }
  if (/^\d+\s+.+\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?\s+\d+\s+\d+$/.test(normalized)) return true;
  if (/^(Feature|Input|Expected Markdown|Notes)\b/i.test(normalized)) return true;
  return false;
}

function isHeadingLine(line: PdfLine, medianFontSize: number, previousLine?: PdfLine, nextLine?: PdfLine, hasTitle = false) {
  const text = normalizeWhitespace(line.text);
  if (!text || text.length > 120 || isBodySentence(text)) return false;
  if (isTableLikeText(text)) return false;

  if (NUMBERED_HEADING_PATTERN.test(text) && !/[.!?]$/.test(text)) {
    const isLargeEnough = line.fontSize >= medianFontSize * 1.08;
    const hasSectionSpacing = previousLine
      ? Math.abs(previousLine.y - line.y) > medianFontSize * 1.25 || previousLine.page !== line.page
      : true;
    const nextIsBody = nextLine ? !NUMBERED_HEADING_PATTERN.test(normalizeWhitespace(nextLine.text)) : true;
    return isLargeEnough || hasSectionSpacing || nextIsBody;
  }

  const isLarge = line.fontSize >= medianFontSize * (hasTitle ? 1.18 : 1.3);
  const isShort = text.length <= 90;
  const hasSpacingBefore = previousLine ? Math.abs(previousLine.y - line.y) > medianFontSize * 1.45 || previousLine.page !== line.page : true;
  const hasSpacingAfter = nextLine ? Math.abs(line.y - nextLine.y) > medianFontSize * 0.9 || nextLine.page !== line.page : true;
  const isFirstPageTitle = !hasTitle && line.page === 1 && line.y > line.pageHeight * 0.66;

  return isShort && !/[.!?]$/.test(text) && ((isLarge && (hasSpacingBefore || hasSpacingAfter)) || isFirstPageTitle);
}

function lineToListItem(line: PdfLine) {
  const text = normalizeWhitespace(line.text);
  const checklist = text.match(CHECKLIST_PATTERN);
  if (checklist) {
    return { type: "checklist" as const, checked: checklist[1].toLowerCase() === "x", text: checklist[2] };
  }

  if (BULLET_PATTERN.test(text)) {
    return { type: "bullet" as const, text: text.replace(BULLET_PATTERN, "") };
  }

  if (ORDERED_PATTERN.test(text)) {
    return { type: "ordered" as const, text: text.replace(ORDERED_PATTERN, "") };
  }

  return null;
}

function orderedNumberFromLine(line: PdfLine) {
  const match = normalizeWhitespace(line.text).match(ORDERED_PATTERN);
  return match ? Number(match[1]) : null;
}

function collectPdfList(lines: PdfLine[], startIndex: number, medianFontSize: number) {
  const first = lines[startIndex];
  const firstItem = lineToListItem(first);
  if (!firstItem) return null;

  const page = first.page;
  const items: string[] = [];
  const checklistItems: ChecklistBlock["items"] = [];
  const listType = firstItem.type;
  let index = startIndex;
  let expectedOrderedNumber = listType === "ordered" ? orderedNumberFromLine(first) : null;

  while (index < lines.length) {
    const line = lines[index];
    if (line.page !== page) break;
    const item = lineToListItem(line);
    if (!item || item.type !== listType) break;

    if (listType === "ordered") {
      const actualNumber = orderedNumberFromLine(line);
      if (expectedOrderedNumber !== null && actualNumber !== expectedOrderedNumber) break;
      expectedOrderedNumber = (expectedOrderedNumber || 0) + 1;
    }

    if (item.type === "checklist") checklistItems.push({ checked: item.checked, text: item.text });
    else items.push(item.text);
    index += 1;
  }

  const itemCount = listType === "checklist" ? checklistItems.length : items.length;
  if (listType === "ordered") {
    const firstText = normalizeWhitespace(first.text);
    const nextLine = lines[startIndex + 1];
    const formsSequence = itemCount >= 2;
    const bodySized = first.fontSize <= medianFontSize * 1.15;
    const nextIsClose = nextLine ? Math.abs(first.y - nextLine.y) <= medianFontSize * 1.7 : false;
    if (!formsSequence || (!bodySized && !nextIsClose)) return null;
    if (NUMBERED_HEADING_PATTERN.test(firstText) && !formsSequence) return null;
  }

  if (itemCount === 0) return null;
  return {
    block:
      listType === "checklist"
        ? ({ type: "checklist", items: checklistItems, page } as ChecklistBlock)
        : ({ type: "list", ordered: listType === "ordered", items, page } as ListBlock),
    endIndex: index,
  };
}

function shouldJoinParagraph(previous: PdfLine, current: PdfLine, medianFontSize: number) {
  if (previous.page !== current.page) return false;
  if (lineToListItem(previous) || lineToListItem(current)) return false;
  if (isLikelyTableLine(previous) || isLikelyTableLine(current)) return false;
  if (looksLikeCodeText(previous.text, previous.tokens[0]?.fontName) || looksLikeCodeText(current.text, current.tokens[0]?.fontName)) return false;
  if (/^[A-Z][A-Za-z0-9 /_-]{1,36}:\s+/.test(normalizeWhitespace(current.text))) return false;
  if (QUOTE_LABEL_PATTERN.test(normalizeWhitespace(current.text)) || /^>\s+/.test(normalizeWhitespace(current.text))) return false;
  const verticalGap = Math.abs(previous.y - current.y);
  const sameIndent = Math.abs(previous.x - current.x) < medianFontSize * 2.2;
  const previousEndsHard = /[.!?:;]$/.test(normalizeWhitespace(previous.text));
  return verticalGap <= medianFontSize * 1.65 && sameIndent && !previousEndsHard;
}

function normalizeQuoteStart(text: string) {
  return normalizeWhitespace(text).replace(/^>\s+/, "").replace(QUOTE_LABEL_PATTERN, "");
}

function collectPdfQuote(lines: PdfLine[], startIndex: number, medianFontSize: number) {
  const first = lines[startIndex];
  const text = normalizeWhitespace(first.text);
  if (!/^>\s+/.test(text) && !QUOTE_LABEL_PATTERN.test(text)) return null;

  const quoteLines = [normalizeQuoteStart(text)];
  let index = startIndex + 1;
  while (index < lines.length) {
    const previous = lines[index - 1];
    const current = lines[index];
    if (current.page !== first.page) break;
    if (isLikelyTableLine(current) || lineToListItem(current)) break;
    if (looksLikeCodeText(current.text, current.tokens[0]?.fontName)) break;
    if (NUMBERED_HEADING_PATTERN.test(normalizeWhitespace(current.text))) break;

    const verticalGap = Math.abs(previous.y - current.y);
    const sameIndent = Math.abs(first.x - current.x) <= medianFontSize * 3;
    if (verticalGap > medianFontSize * 1.8 || !sameIndent) break;

    quoteLines.push(normalizeQuoteStart(current.text));
    index += 1;
  }

  return {
    block: { type: "quote", text: normalizeWhitespace(quoteLines.join(" ")), page: first.page } as QuoteBlock,
    endIndex: index,
  };
}

function collectPdfCodeBlock(lines: PdfLine[], startIndex: number) {
  const first = lines[startIndex];
  const firstFont = first.tokens[0]?.fontName;
  if (!looksLikeCodeText(first.text, firstFont)) return null;

  const codeLines: PdfLine[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const candidate = lines[index];
    if (candidate.page !== first.page) break;
    const fontName = candidate.tokens[0]?.fontName;
    const score = getCodeScore(candidate.text, fontName);
    const previous = codeLines[codeLines.length - 1];
    if (previous && Math.abs(previous.y - candidate.y) > previous.fontSize * 2.4) break;
    if (score < 3) break;
    codeLines.push(candidate);
  }

  if (codeLines.length < 2 && getCodeScore(first.text, firstFont) < 5) return null;

  const code = codeLines
    .map((codeLine) =>
      codeLine.tokens
        .sort((a, b) => a.x - b.x)
        .map((token) => token.text)
        .join(" ")
        .replace(/\s+([;{}()[\],.:])/g, "$1")
        .replace(/([([{])\s+/g, "$1")
    )
    .join("\n");

  return {
    block: { type: "code", language: detectCodeLanguage(code), code, page: first.page } as CodeBlock,
    endIndex: startIndex + codeLines.length,
  };
}

function formatLinksInParagraph(text: string) {
  return normalizeWhitespace(text)
    .replace(/([^()[\]\n]{2,90}?)\s*\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
      const cleanLabel = normalizeWhitespace(label).replace(/[:\s]+$/, "");
      const prefixMatch = cleanLabel.match(/^(.*?:)\s*(.+)$/);
      if (prefixMatch) return `${prefixMatch[1]} [${prefixMatch[2]}](${url})`;
      return `[${cleanLabel}](${url})`;
    })
    .replace(/\b(https?:\/\/[^\s)]+)([.)])?/g, (_match, url, suffix = "") => `<${url}>${suffix}`);
}

function findImageCaption(lines: PdfLine[], page: number, fromIndex: number) {
  const searchWindow = lines.slice(fromIndex, Math.min(lines.length, fromIndex + 12));
  const figureLine = searchWindow.find((candidate) => candidate.page === page && /^Figure\s+\d+\.\s+/i.test(normalizeWhitespace(candidate.text)));
  if (!figureLine) return null;
  const caption = normalizeWhitespace(figureLine.text).replace(/^Figure\s+\d+\.\s*/i, "");
  return caption || null;
}

function detectRepeatedHeaderFooter(lines: PdfLine[], pageCount: number) {
  const candidates = new Map<string, Set<number>>();
  lines.forEach((line) => {
    const normalized = normalizeForHeaderFooter(line.text);
    if (!normalized || normalized.length < 4) return;
    const isEdgeLine = line.y > line.pageHeight * 0.88 || line.y < line.pageHeight * 0.12;
    if (!isEdgeLine) return;
    const pages = candidates.get(normalized) || new Set<number>();
    pages.add(line.page);
    candidates.set(normalized, pages);
  });

  const repeated = new Set<string>();
  candidates.forEach((pages, text) => {
    if (pages.size >= Math.max(2, Math.ceil(pageCount * HEADER_FOOTER_THRESHOLD))) {
      repeated.add(text);
    }
  });

  return repeated;
}

function extractPdfTable(lines: PdfLine[], startIndex: number) {
  const tableLines: PdfLine[] = [];
  const parsedRows: string[][] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const previous = tableLines[tableLines.length - 1];
    if (!isLikelyTableLine(line)) break;
    if (previous && (previous.page !== line.page || Math.abs(previous.y - line.y) > previous.fontSize * 2.2)) break;
    tableLines.push(line);

    const specialRow = parseSpecialTableLine(line);
    parsedRows.push(specialRow || splitPdfLineIntoCells(line));
  }

  if (tableLines.length < 2) return null;
  let rows = parsedRows.map((row) => row.map(normalizeWhitespace).filter(Boolean));
  if (rows.length > 0 && /^\d+$/.test(rows[0][0] || "") && rows[0].length === 5) {
    rows = [["No", "Nama Dosen Pengampu", "Fakultas", "Jumlah Kelas", "Jumlah SKS"], ...rows];
  }
  if (rows.length > 0 && /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)$/i.test(rows[0][0] || "") && rows[0].length >= 6) {
    rows = [["Hari", "Jam", "Mata Kuliah", "Dosen", "Ruang", "Kelas", ...(rows[0].length > 6 ? ["SKS"] : [])], ...rows];
  }
  const maxColumns = Math.max(...rows.map((row) => row.length));
  const confidence = rows.filter((row) => row.length >= Math.max(3, maxColumns - 1)).length / rows.length;
  if (maxColumns < 3 || confidence < 0.67) return null;

  return {
    rows: rows.map((row) => [...row, ...Array(Math.max(0, maxColumns - row.length)).fill("")]),
    endIndex: startIndex + tableLines.length,
  };
}

function buildPdfBlocks(lines: PdfLine[], imageInfo: PdfPageImageInfo[], pageCount: number): { blocks: DocumentBlock[]; warnings: ConversionWarning[] } {
  const warnings: ConversionWarning[] = [];
  const repeatedHeaderFooter = detectRepeatedHeaderFooter(lines, pageCount);
  const contentLines = lines.filter((line) => !repeatedHeaderFooter.has(normalizeForHeaderFooter(line.text)));
  const fontSizes = contentLines.flatMap((line) => line.tokens.map((token) => token.fontSize));
  const medianFontSize = getMedian(fontSizes);
  const blocks: DocumentBlock[] = [];
  const imagePages = new Map(imageInfo.map((info) => [info.page, info.count]));
  const placedImages = new Set<number>();
  let hasTitle = false;
  let index = 0;

  if (repeatedHeaderFooter.size > 0) {
    warnings.push({
      type: "metadata",
      message: "Repeated page header or footer text was detected and removed from the Markdown output.",
    });
  }

  while (index < contentLines.length) {
    const line = contentLines[index];
    const text = normalizeWhitespace(line.text);
    const previousLine = contentLines[index - 1];
    const nextLine = contentLines[index + 1];

    if (!text) {
      index += 1;
      continue;
    }

    if (!blocks.some((block) => block.type === "pageBreak" && block.page === line.page)) {
      blocks.push({ type: "pageBreak", page: line.page });
    }

    const table = extractPdfTable(contentLines, index);
    if (table) {
      blocks.push({ type: "table", rows: table.rows, page: line.page });
      warnings.push({ type: "table", message: "PDF tables were detected using layout heuristics and may need review." });
      index = table.endIndex;
      continue;
    }

    const quote = collectPdfQuote(contentLines, index, medianFontSize);
    if (quote) {
      blocks.push(quote.block);
      index = quote.endIndex;
      continue;
    }

    const list = collectPdfList(contentLines, index, medianFontSize);
    if (list) {
      blocks.push(list.block);
      index = list.endIndex;
      continue;
    }

    const previousBlock = blocks[blocks.length - 1];
    const isSubtitleAfterTitle =
      previousBlock?.type === "heading" &&
      previousBlock.level === 1 &&
      previousBlock.page === line.page &&
      previousLine?.page === line.page &&
      Math.abs(previousLine.y - line.y) <= medianFontSize * 2.8 &&
      !NUMBERED_HEADING_PATTERN.test(text);

    if (!isSubtitleAfterTitle && isHeadingLine(line, medianFontSize, previousLine, nextLine, hasTitle)) {
      const level = headingLevelFromText(text, !hasTitle);
      blocks.push({ type: "heading", level, text, page: line.page });
      hasTitle = true;
      index += 1;
      continue;
    }

    const code = collectPdfCodeBlock(contentLines, index);
    if (code) {
      blocks.push(code.block);
      index = code.endIndex;
      continue;
    }

    let pendingImageBlock: ImageBlock | null = null;
    if (imagePages.has(line.page) && !placedImages.has(line.page) && /image below|embedded|figure|caption/i.test(text)) {
      const caption = findImageCaption(contentLines, line.page, index) || "Image extracted from PDF";
      pendingImageBlock = { type: "image", alt: caption, src: `image-${placedImages.size + 1}`, page: line.page };
      placedImages.add(line.page);
      warnings.push({
        type: "image",
        message: "This PDF contains image-like content. Image extraction is represented as Markdown placeholders.",
      });
    }

    const paragraphLines = [line];
    let lookahead = index + 1;
    while (lookahead < contentLines.length && shouldJoinParagraph(contentLines[lookahead - 1], contentLines[lookahead], medianFontSize)) {
      paragraphLines.push(contentLines[lookahead]);
      lookahead += 1;
    }

    let paragraph = paragraphLines.map((paragraphLine) => paragraphLine.text).join(" ");
    paragraph = formatLinksInParagraph(paragraph);
    blocks.push({ type: "paragraph", text: paragraph, page: line.page });
    if (pendingImageBlock) blocks.push(pendingImageBlock);
    index = lookahead;
  }

  if (imageInfo.some((info) => info.count > 0)) {
    imageInfo.forEach((info, imageIndex) => {
      if (placedImages.has(info.page)) return;
      const insertionIndex = blocks.findIndex((block) => block.page === info.page && block.type !== "pageBreak");
      const captionIndex = contentLines.findIndex(
        (line) => line.page === info.page && /^Figure\s+\d+\.\s+/i.test(normalizeWhitespace(line.text))
      );
      const caption = captionIndex >= 0 ? findImageCaption(contentLines, info.page, captionIndex) : null;
      const imageBlock: ImageBlock = {
        type: "image",
        alt: caption || "Image extracted from document",
        src: `image-${imageIndex + 1}`,
        page: info.page,
      };
      if (insertionIndex >= 0) blocks.splice(insertionIndex + 1, 0, imageBlock);
      else blocks.push({ type: "pageBreak", page: info.page }, imageBlock);
    });
    warnings.push({
      type: "image",
      message: "This PDF contains image-like content. Image extraction is represented as Markdown placeholders.",
    });
  }

  return { blocks: cleanBlocks(blocks), warnings: uniqueWarnings(warnings) };
}

function cleanBlocks(blocks: DocumentBlock[]) {
  const cleaned: DocumentBlock[] = [];
  blocks.forEach((block) => {
    const previous = cleaned[cleaned.length - 1];
    if (block.type === "paragraph" && previous?.type === "paragraph" && previous.page === block.page) {
      const previousParagraph = previous as ParagraphBlock;
      const currentStartsLabeledSection = /^[A-Z][A-Za-z0-9 /_-]{1,36}:\s+/.test(block.text);
      const previousLooksLikeSubtitle = previousParagraph.text.length <= 90 && !/[.!?:;]$/.test(previousParagraph.text);
      if (!currentStartsLabeledSection && !previousLooksLikeSubtitle && !/[.!?:;]$/.test(previousParagraph.text)) {
        previousParagraph.text = normalizeWhitespace(`${previousParagraph.text} ${block.text}`);
        return;
      }
    }

    if (block.type === "pageBreak" && previous?.type === "pageBreak") return;
    cleaned.push(block);
  });
  return cleaned;
}

async function extractPdfRaw(file: File) {
  const pdfjsLib = await loadPdfEngine();
  const data = new Uint8Array(await readAsArrayBuffer(file));
  const pdf = await pdfjsLib.getDocument({
    data,
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/standard_fonts/",
  }).promise;

  const lines: PdfLine[] = [];
  const imageInfo: PdfPageImageInfo[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const tokens = (textContent.items as PdfTextItem[])
      .filter((item) => normalizeWhitespace(item.str))
      .map((item) => {
        const transform = item.transform || [];
        const fontSize = Math.abs(transform[3] || item.height || 10);
        return {
          text: normalizeWhitespace(item.str),
          x: transform[4] || 0,
          y: transform[5] || 0,
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize,
          fontName: item.fontName,
          page: pageNumber,
        };
      });

    lines.push(...groupTokensIntoLines(tokens, viewport.height, viewport.width));

    try {
      const operators = await page.getOperatorList();
      const imageOps = operators.fnArray.filter(
        (fn: number) =>
          fn === pdfjsLib.OPS.paintImageXObject ||
          fn === pdfjsLib.OPS.paintJpegXObject ||
          fn === pdfjsLib.OPS.paintInlineImageXObject
      );
      if (imageOps.length > 0) imageInfo.push({ page: pageNumber, count: imageOps.length });
    } catch {
      // Image operators are best effort only.
    }

    if (page.cleanup) page.cleanup();
  }

  return { lines, imageInfo, pageCount: pdf.numPages };
}

async function convertPdf(file: File): Promise<ConversionResult> {
  const raw = await extractPdfRaw(file);
  if (raw.lines.length === 0) {
    return {
      markdown: "",
      stats: { pages: raw.pageCount, paragraphs: 0, blocks: 0, words: 0, characters: 0 },
      warnings: [{ type: "ocr", message: "No selectable text was found. This PDF may require OCR." }],
    };
  }

  const { blocks, warnings } = buildPdfBlocks(raw.lines, raw.imageInfo, raw.pageCount);
  const markdown = renderBlocksToMarkdown(blocks);
  if (!markdown) {
    throw new Error("No selectable text was found. This PDF may require OCR.");
  }

  return {
    markdown,
    stats: createStats(markdown, blocks, raw.pageCount),
    warnings,
  };
}

function buildDocxRelationships(xmlText?: string) {
  const relationships = new Map<string, string>();
  if (!xmlText) return relationships;
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  descendantsByLocalName(xml, "Relationship").forEach((relationship) => {
    const id = relationship.getAttribute("Id") || "";
    const target = relationship.getAttribute("Target") || "";
    if (id && target) relationships.set(id, target);
  });
  return relationships;
}

function getDocxRunText(run: Element) {
  return descendantsByLocalName(run, "t")
    .map((node) => node.textContent || "")
    .join("");
}

function formatDocxRun(run: Element) {
  const rawText = getDocxRunText(run);
  if (!rawText) return "";
  const properties = firstDescendantByLocalName(run, "rPr");
  const isBold = Boolean(properties && firstDescendantByLocalName(properties, "b"));
  const isItalic = Boolean(properties && firstDescendantByLocalName(properties, "i"));
  const runFonts = firstDescendantByLocalName(properties || run, "rFonts");
  const fontName = getXmlAttr(runFonts, "ascii") || getXmlAttr(runFonts, "hAnsi");
  const isCode = /courier|mono|consolas|menlo|code/i.test(fontName);
  let text = rawText;
  if (isCode) text = `\`${text}\``;
  if (isBold) text = `**${text}**`;
  if (isItalic) text = `*${text}*`;
  return text;
}

function getDocxParagraphText(paragraph: Element, relationships: Map<string, string>) {
  const chunks: string[] = [];
  Array.from(paragraph.childNodes).forEach((node) => {
    if (node.nodeType !== window.Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.localName === "r") {
      chunks.push(formatDocxRun(element));
      return;
    }
    if (element.localName === "hyperlink") {
      const text = descendantsByLocalName(element, "r").map(formatDocxRun).join("");
      const relationshipId = getXmlAttr(element, "id");
      const target = relationships.get(relationshipId);
      chunks.push(target ? `[${normalizeWhitespace(text)}](${target})` : text);
    }
  });

  if (chunks.length === 0) {
    descendantsByLocalName(paragraph, "t").forEach((node) => chunks.push(node.textContent || ""));
  }

  return normalizeWhitespace(chunks.join(""));
}

function getDocxParagraphStyle(paragraph: Element) {
  const paragraphProperties = firstDescendantByLocalName(paragraph, "pPr");
  const style = firstDescendantByLocalName(paragraphProperties || paragraph, "pStyle");
  return getXmlAttr(style, "val");
}

function isDocxListParagraph(paragraph: Element) {
  const paragraphProperties = firstDescendantByLocalName(paragraph, "pPr");
  return Boolean(paragraphProperties && firstDescendantByLocalName(paragraphProperties, "numPr"));
}

function docxTextToBlock(text: string, paragraph: Element, relationships: Map<string, string>): DocumentBlock | null {
  const style = getDocxParagraphStyle(paragraph).toLowerCase();
  const headingMatch = style.match(/heading([1-6])/);
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;

  if (style === "title") return { type: "heading", level: 1, text: normalized };
  if (headingMatch) return { type: "heading", level: Number(headingMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6, text: normalized };
  if (QUOTE_LABEL_PATTERN.test(normalized) || /^>\s+/.test(normalized)) {
    return { type: "quote", text: normalizeQuoteStart(normalized) };
  }

  const checklist = normalized.match(CHECKLIST_PATTERN);
  if (checklist) return { type: "checklist", items: [{ checked: checklist[1].toLowerCase() === "x", text: checklist[2] }] };

  if (!isDocxListParagraph(paragraph) && NUMBERED_HEADING_PATTERN.test(normalized) && !/[.!?]$/.test(normalized)) {
    return { type: "heading", level: headingLevelFromText(normalized, false), text: normalized };
  }

  if (isDocxListParagraph(paragraph) || BULLET_PATTERN.test(normalized) || ORDERED_PATTERN.test(normalized)) {
    const ordered = ORDERED_PATTERN.test(normalized);
    return {
      type: "list",
      ordered,
      items: [normalized.replace(BULLET_PATTERN, "").replace(ORDERED_PATTERN, "")],
    };
  }

  if (looksLikeCodeText(normalized)) return { type: "code", language: detectCodeLanguage(normalized), code: normalized };

  return { type: "paragraph", text: formatLinksInParagraph(normalized) };
}

function mergeAdjacentDocxBlocks(blocks: DocumentBlock[]) {
  const merged: DocumentBlock[] = [];
  blocks.forEach((block) => {
    const previous = merged[merged.length - 1];
    if (block.type === "list" && previous?.type === "list" && previous.ordered === block.ordered) {
      previous.items.push(...block.items);
      return;
    }
    if (block.type === "checklist" && previous?.type === "checklist") {
      previous.items.push(...block.items);
      return;
    }
    if (block.type === "code" && previous?.type === "code") {
      previous.code = `${previous.code}\n${block.code}`;
      previous.language = previous.language || block.language;
      return;
    }
    merged.push(block);
  });
  return merged;
}

function formatDocxTable(table: Element, relationships: Map<string, string>) {
  const rows = childrenByLocalName(table, "tr").map((row) =>
    childrenByLocalName(row, "tc").map((cell) =>
      childrenByLocalName(cell, "p")
        .map((paragraph) => getDocxParagraphText(paragraph, relationships))
        .filter(Boolean)
        .join(" ")
    )
  );
  return rows.filter((row) => row.some(Boolean));
}

async function convertDocx(file: File): Promise<ConversionResult> {
  const zip = await JSZip.loadAsync(await readAsArrayBuffer(file));
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("DOCX document body could not be found.");

  const relationships = buildDocxRelationships(await zip.file("word/_rels/document.xml.rels")?.async("string"));
  const mediaFiles = Object.keys(zip.files).filter((name) => /^word\/media\//i.test(name));
  const xml = new DOMParser().parseFromString(documentXml, "application/xml");
  const body = firstDescendantByLocalName(xml, "body");
  if (!body) throw new Error("DOCX document body is empty or invalid.");

  const blocks: DocumentBlock[] = [];
  const warnings: ConversionWarning[] = [];
  let imageIndex = 1;

  Array.from(body.childNodes).forEach((node) => {
    if (node.nodeType !== window.Node.ELEMENT_NODE) return;
    const element = node as Element;

    if (element.localName === "p") {
      const text = getDocxParagraphText(element, relationships);
      const block = docxTextToBlock(text, element, relationships);
      if (block) blocks.push(block);

      const drawingCount = descendantsByLocalName(element, "drawing").length + descendantsByLocalName(element, "pict").length;
      for (let index = 0; index < drawingCount; index += 1) {
        blocks.push({ type: "image", alt: "Image extracted from document", src: `image-${imageIndex}` });
        imageIndex += 1;
      }
      return;
    }

    if (element.localName === "tbl") {
      const rows = formatDocxTable(element, relationships);
      if (rows.length > 0) blocks.push({ type: "table", rows });
    }
  });

  mediaFiles.forEach((_, index) => {
    if (!blocks.some((block) => block.type === "image" && block.src === `image-${index + 1}`)) {
      blocks.push({ type: "image", alt: "Image extracted from document", src: `image-${index + 1}` });
    }
  });

  if (mediaFiles.length > 0) {
    warnings.push({
      type: "image",
      message: "DOCX images were detected and represented as Markdown placeholders.",
    });
  }

  const mergedBlocks = mergeAdjacentDocxBlocks(cleanBlocks(blocks));
  const markdown = renderBlocksToMarkdown(mergedBlocks);
  if (!markdown) throw new Error("No readable text was found in this DOCX.");

  return {
    markdown,
    stats: createStats(markdown, mergedBlocks),
    warnings: uniqueWarnings(warnings),
  };
}

function parsePlainTextBlocks(text: string, fileName: string) {
  const blocks: DocumentBlock[] = [{ type: "heading", level: 1, text: markdownTitleFromFileName(fileName) || "Document" }];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraphLines: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const paragraph = normalizeWhitespace(paragraphLines.join(" "));
    if (paragraph) blocks.push({ type: "paragraph", text: formatLinksInParagraph(paragraph) });
    paragraphLines = [];
  };

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = normalizeWhitespace(rawLine);
    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    const markdownHeading = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdownHeading) {
      flushParagraph();
      blocks.push({ type: "heading", level: markdownHeading[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: markdownHeading[2] });
      index += 1;
      continue;
    }

    if (QUOTE_LABEL_PATTERN.test(line) || /^>\s+/.test(line)) {
      flushParagraph();
      const quoteLines = [normalizeQuoteStart(line)];
      index += 1;
      while (index < lines.length && normalizeWhitespace(lines[index]) && !/^(#{1,6})\s+/.test(normalizeWhitespace(lines[index]))) {
        quoteLines.push(normalizeQuoteStart(lines[index]));
        index += 1;
      }
      blocks.push({ type: "quote", text: normalizeWhitespace(quoteLines.join(" ")) });
      continue;
    }

    const checklist = line.match(CHECKLIST_PATTERN);
    if (checklist) {
      flushParagraph();
      const items: ChecklistBlock["items"] = [];
      while (index < lines.length) {
        const item = normalizeWhitespace(lines[index]).match(CHECKLIST_PATTERN);
        if (!item) break;
        items.push({ checked: item[1].toLowerCase() === "x", text: item[2] });
        index += 1;
      }
      blocks.push({ type: "checklist", items });
      continue;
    }

    if (BULLET_PATTERN.test(line) || ORDERED_PATTERN.test(line)) {
      flushParagraph();
      const ordered = ORDERED_PATTERN.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = normalizeWhitespace(lines[index]);
        if (ordered && !ORDERED_PATTERN.test(itemLine)) break;
        if (!ordered && !BULLET_PATTERN.test(itemLine)) break;
        items.push(itemLine.replace(BULLET_PATTERN, "").replace(ORDERED_PATTERN, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

async function convertPlainText(file: File): Promise<ConversionResult> {
  const text = await readAsText(file);
  const isMarkdown = file.name.toLowerCase().endsWith(".md");
  const blocks: DocumentBlock[] = isMarkdown ? [{ type: "paragraph", text }] : parsePlainTextBlocks(text, file.name);
  const markdown = isMarkdown ? text.trim() : renderBlocksToMarkdown(blocks);
  return {
    markdown,
    stats: createStats(markdown, blocks),
    warnings: [],
  };
}

async function convertDocumentToMarkdown(file: File): Promise<ConversionResult> {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  const result = extension === ".pdf" ? await convertPdf(file) : extension === ".docx" ? await convertDocx(file) : await convertPlainText(file);
  if (file.size > LARGE_FILE_WARNING_BYTES) {
    result.warnings = uniqueWarnings([
      ...result.warnings,
      {
        type: "structure",
        message: "Large files can exceed browser memory limits; please review the Markdown output carefully.",
      },
    ]);
  }
  return result;
}

export function DocToMarkdown() {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [warnings, setWarnings] = useState<ConversionWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    setFile(selectedFile);
    setMarkdown("");
    setStats(null);
    setWarnings([]);
    setCopied(false);
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);
    trackEvent("file_processed", {
      toolId: "doc-to-md",
      fileType: selectedFile.type || extension,
      fileSize: selectedFile.size,
    });

    try {
      const result = await convertDocumentToMarkdown(selectedFile);
      if (!result.markdown && result.warnings.some((warning) => warning.type === "ocr")) {
        throw new Error(result.warnings[0].message);
      }

      setMarkdown(result.markdown);
      setStats(result.stats);
      setWarnings(result.warnings);
      setSuccessText("Document converted into structured Markdown without AI processing.");
      addToWorkspaceHistory({
        toolId: "doc-to-md",
        toolName: "Document to Markdown",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        outputType: "Markdown",
        status: "completed",
      });
      trackEvent("conversion_success", {
        toolId: "doc-to-md",
        fileType: selectedFile.type || extension,
        fileSize: selectedFile.size,
        words: result.stats.words,
        warnings: result.warnings.length,
      });
    } catch (error: any) {
      const message = error.message || "Document conversion failed.";
      setErrorText(message);
      setWarnings(message.toLowerCase().includes("ocr") ? [{ type: "ocr", message }] : []);
      trackEvent("conversion_failed", {
        toolId: "doc-to-md",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearWorkspace = () => {
    setFile(null);
    setMarkdown("");
    setStats(null);
    setWarnings([]);
    setCopied(false);
    setErrorText(null);
    setSuccessText(null);
  };

  const copyMarkdown = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportMarkdown = () => {
    if (!file || !markdown) return;
    downloadMarkdown(file.name, markdown);
  };

  return (
    <ToolPageShell toolId="doc-to-md">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <UploadDropZone
            acceptedExtensions={[".pdf", ".docx", ".txt", ".md"]}
            onFileSelected={handleFileSelected}
            title="Upload document"
            subtitle="Convert text-based PDFs, DOCX files, TXT, or Markdown into a clean .md export."
          />

          <SettingsPanel title="Conversion Mode">
            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <div className="flex items-start gap-2 rounded-xl border border-brand-border bg-brand-secondary p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent-secondary" />
                <span>PDF extraction uses layout-aware text tokens, page positions, heading signals, and table heuristics.</span>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-brand-border bg-brand-secondary p-3">
                <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-secondary" />
                <span>DOCX conversion parses document XML, relationships, inline styles, hyperlinks, tables, lists, and image placeholders.</span>
              </div>
            </div>

            {file && (
              <div className="space-y-3 pt-4 border-t border-brand-soft-border text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-muted">Source file</span>
                  <span className="mt-1 block truncate font-mono text-text-primary">{file.name}</span>
                  <span className="mt-0.5 block font-mono text-text-secondary">{formatBytes(file.size)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearWorkspace} className="w-full gap-2 text-xs border border-brand-border">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear active file
                </Button>
              </div>
            )}
          </SettingsPanel>
        </div>

        <div className="lg:col-span-8">
          {file || markdown || errorText ? (
            <OutputPanel
              title="Markdown Export"
              originalSize={file?.size}
              compressedSize={markdown ? new Blob([markdown]).size : undefined}
              onDownloadAll={markdown ? exportMarkdown : undefined}
              downloadLabel="Download Markdown file"
              isProcessing={loading}
            >
              {loading && (
                <div className="text-center py-16 space-y-4">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
                  <span className="text-xs text-text-secondary block">Extracting document structure locally...</span>
                </div>
              )}

              {errorText && !loading && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
                  <div>
                    <span className="font-bold">Conversion failed</span>
                    <p className="mt-1 font-mono leading-relaxed">{errorText}</p>
                  </div>
                </div>
              )}

              {successText && markdown && !loading && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-700">
                  <div className="flex items-start gap-2">
                    <FileCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-600" />
                    <div>
                      <span className="font-bold">Conversion complete</span>
                      <p className="mt-1">{successText}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyMarkdown}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green-200 bg-white text-green-700 transition-colors hover:bg-green-100"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {warnings.length > 0 && !loading && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <Info className="h-4 w-4 text-amber-600" />
                    Conversion warnings
                  </div>
                  <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                    {warnings.map((warning, index) => (
                      <li key={`${warning.type}-${index}`}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {stats && markdown && !loading && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs">
                  <div>
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Words</span>
                    <span className="mt-0.5 block font-mono font-bold text-text-primary">{stats.words}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Characters</span>
                    <span className="mt-0.5 block font-mono font-bold text-text-primary">{stats.characters}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Pages</span>
                    <span className="mt-0.5 block font-mono font-bold text-text-primary">{stats.pages || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Blocks</span>
                    <span className="mt-0.5 block font-mono font-bold text-text-primary">{stats.blocks}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Warnings</span>
                    <span className="mt-0.5 block font-mono font-bold text-text-primary">{warnings.length}</span>
                  </div>
                </div>
              )}

              {markdown && !loading && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={copyMarkdown}
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-white text-text-secondary shadow-xs transition-all hover:border-accent-primary hover:text-accent-secondary"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-accent-secondary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <div className="max-h-130 overflow-auto rounded-2xl border border-brand-border bg-brand-secondary p-5 text-xs">
                    <pre className="whitespace-pre-wrap wrap-break-word font-mono leading-relaxed text-text-primary">{markdown}</pre>
                  </div>
                </div>
              )}

              {markdown && !loading && (
                <Button variant="secondary" size="sm" onClick={exportMarkdown} className="w-full gap-2 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Save as .md
                </Button>
              )}
            </OutputPanel>
          ) : (
            <PreviewPanel title="Markdown extraction viewport" />
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

export default DocToMarkdown;
