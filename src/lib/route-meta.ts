import { TOOLS_LIST } from "./constants/tools";

interface RouteMeta {
  title: string;
  description: string;
}

const DEFAULT_META: RouteMeta = {
  title: "Kurio Studio | Browser-first creative file tools",
  description:
    "Kurio Studio is a public beta creative toolkit for converting, compressing, resizing, formatting, and previewing files directly in your browser.",
};

const STATIC_ROUTE_META: Record<string, RouteMeta> = {
  "/": DEFAULT_META,
  "/tools": {
    title: "Creative File Tools | Kurio Studio",
    description: "Browse Kurio Studio tools for PDFs, images, JSON, Lottie animations, and creator workflows.",
  },
  "/workspace": {
    title: "Workspace History | Kurio Studio",
    description: "Review recent Kurio Studio file activity stored locally in your browser.",
  },
  "/ai-helper": {
    title: "AI Creative Helper | Kurio Studio",
    description: "Use Kurio Studio AI helpers for workflow routing, filename ideas, and creator captions.",
  },
  "/settings": {
    title: "Privacy & Beta Info | Kurio Studio",
    description: "Learn how Kurio Studio handles local file tools, AI helper requests, and public beta limits.",
  },
  "/privacy": {
    title: "Privacy Policy | Kurio Studio",
    description: "Understand how Kurio Studio handles local files, AI helper requests, analytics, and browser history.",
  },
  "/terms": {
    title: "Terms of Use | Kurio Studio",
    description: "Read the beta terms for using Kurio Studio file tools and AI helper features.",
  },
  "/contact": {
    title: "Contact & Feedback | Kurio Studio",
    description: "Contact Kurio Studio, report beta issues, or send feedback about file conversion tools.",
  },
};

function getToolRouteMeta(path: string): RouteMeta | null {
  const tool = TOOLS_LIST.find((item) => item.slug === path);
  if (!tool) return null;

  return {
    title: `${tool.name} | Kurio Studio`,
    description: tool.description,
  };
}

function setMetaTag(selector: string, attribute: "content" | "href", value: string) {
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

export function updateRouteMeta(route: string) {
  if (typeof document === "undefined") return;

  const path = route.split("?")[0] || "/";
  const meta = getToolRouteMeta(path) || STATIC_ROUTE_META[path] || DEFAULT_META;
  const canonicalUrl = `${window.location.origin}${path}`;

  document.title = meta.title;
  setMetaTag('meta[name="description"]', "content", meta.description);
  setMetaTag('link[rel="canonical"]', "href", canonicalUrl);
  setMetaTag('meta[property="og:title"]', "content", meta.title);
  setMetaTag('meta[property="og:description"]', "content", meta.description);
  setMetaTag('meta[property="og:url"]', "content", canonicalUrl);
  setMetaTag('meta[name="twitter:title"]', "content", meta.title);
  setMetaTag('meta[name="twitter:description"]', "content", meta.description);
}
