import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Public surfaces that AI crawlers are allowed to read — the marketing
// brand site plus tools. We explicitly allow the major AI crawlers
// because we want Overview / answer-box citations; hiding from them just
// means the model hallucinates our positioning instead of quoting it.
const AI_ALLOW: string[] = [
  "/",
  "/story",
  "/work",
  "/signals",
  "/sectors",
  "/insights",
  "/tools",
  "/contact",
  "/about",
  "/now",
  "/uses",
  "/privacy",
  "/impressum",
];

// Everything private: CRM sub-app, auth flow, API routes, Next.js
// internals, and the dev-only preview harness.
const PRIVATE_DISALLOW: string[] = [
  "/philly/",
  "/api/",
  "/login",
  "/app",
  "/dashboard",
  "/_next/",
  "/preview/",
];

// Keep this list tight — only the crawlers whose surfaces we actually
// care about getting indexed in. Add a new entry when a new AI assistant
// proves to have real citation share.
const AI_CRAWLERS: string[] = [
  "GPTBot",            // OpenAI (ChatGPT search + training)
  "ChatGPT-User",      // OpenAI live-browsing on user requests
  "OAI-SearchBot",     // OpenAI SearchGPT index
  "Google-Extended",   // Google Gemini / AI Overviews training opt-in
  "ClaudeBot",         // Anthropic (Claude + claude.ai/search)
  "Claude-Web",        // Anthropic live-browsing
  "Applebot-Extended", // Apple Intelligence training opt-in
  "PerplexityBot",     // Perplexity index
  "Perplexity-User",   // Perplexity live-fetch on user requests
  "CCBot",             // Common Crawl (feeds most open-source LLMs)
  "Amazonbot",         // Amazon Alexa/Titan training
  "Bytespider",        // ByteDance (TikTok search + Doubao)
  "Meta-ExternalAgent",// Meta AI fetcher
  "DuckAssistBot",     // DuckDuckGo AI
  "cohere-ai",         // Cohere
  "YouBot",            // You.com
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: AI_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
