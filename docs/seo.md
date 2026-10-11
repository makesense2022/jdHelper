

<!-- website-foundation:start -->
# SEO and AI discovery

Site: Resume Assistant. Production URL: **Unconfirmed; configure SITE_URL before publication. No domain has been guessed.**

Configuration lives in `site.foundation.json`. Existing titles, descriptions, metadata and structured data are retained. Missing metadata is filled from real page headings/descriptions; no reviews, facts, authors or dates are fabricated. Confirmed origins own canonicals and OG URLs; query/hash variants are not indexed independently. Static export finalization scans actual public HTML, excluding 404, private, test and preview pages. Native framework sitemap/robots routes remain the owner when present.

Generated files: `robots.txt`, `sitemap.xml` when a domain is configured, `llms.txt`, `llms-full.txt`, and `site-content-index.json`. AI files contain summaries/excerpts of the same public HTML. Private notes and unapproved content are excluded; the existing noindex/review boundary is retained. SPA modal content still needs explicit accessible URLs or prerendering to become independent search pages; no fictitious deep routes are added.

Title rule: meaningful page title + website name. Descriptions match the actual content; social tags use that same title and description. Structured data uses only WebSite/WebPage unless a project already provides a more specific accurate type. An OG WebP is available as a fallback; generated SVG/PNG sources are preserved under docs/assets.

## Google Search Console Setup

1. Add the confirmed production address as a URL-prefix property, or use DNS verification for a domain property.
2. For HTML-tag verification, copy only the token into `GOOGLE_SITE_VERIFICATION` (or the framework's public variable). A blank variable emits no extra tag. Existing verified tags are preserved.
3. Configure these values on the hosting provider when deployment is authorized.
4. After that deployment, inspect the raw homepage HTML for the verification meta tag, then click Verify in Search Console.
5. Submit the production `/sitemap.xml`; verify it and `/robots.txt` return 200.

No Search Console ownership claim, sitemap submission, indexing result, or deployment is made in this local upgrade. Manual actions are collected in Projects/site-analytics/docs/foundation/search-console-checklist.md.

## Limits and references

`llms.txt` is a discovery aid, not a guarantee of indexing or citation. Google AI features use the core SEO foundation and do not require a special AI file. Crawl accessibility, useful public text, accurate sourcing and route-specific content remain essential.

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080)

<!-- website-foundation:end -->

## Vercel deployment — 2026-10-06

Address: https://learn-gray-ten.vercel.app

Project: `learn`; actual target: production; status: READY. All deployment URLs require Vercel login. Private input and unreviewed content remain noindex. PostHog is off for this protected deployment.
Resume analysis remains unavailable until model configuration and API authorization are configured by the owner in Vercel. No model API credential or private document was uploaded in this deployment. Required variable names: `DEEPSEEK_API_KEY`, `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL_NAME`, `LEARN_API_KEY`; preserve the existing client/server API authorization setup.

Vercel variable names configured: `POSTHOG_KEY`, `POSTHOG_HOST`, `POSTHOG_MODE`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`. `GOOGLE_SITE_VERIFICATION` is still unset.

Deployment method: Vercel cloud Next.js build. Git auto-deployment is not connected. Local `.vercel/` files are excluded from Git backups.

Search Console ownership verification and sitemap submission remain manual. Do not submit protected/private content.

## Production PostHog rollout — 2026-10-07

Site ID: `learn`. Production origin: https://learn-gray-ten.vercel.app. Shared PostHog project: Website Fleet 646771 (US).

Public variable names: `POSTHOG_KEY`, `POSTHOG_HOST`, `POSTHOG_MODE`, `SITE_URL`; production mode is configured, ordinary previews stay off. No secret values belong in these notes.

Published on Vercel; normal Chrome page access produced a production $pageview in PostHog. Existing owner/team login protection and noindex remain.
Only allowed page/interaction metadata is captured. No resume text, job descriptions, uploads, error messages or stacks are sent. Model analysis configuration remains separate.

SDK privacy, route/pageview ownership and ingestion authentication tests pass. Actual business terminal events retain existing triggers; no purchase or completion events are fabricated. Search Console verification/indexing remain separate.
