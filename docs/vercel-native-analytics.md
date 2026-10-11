# Vercel Web Analytics

Official @vercel/analytics 2.0.1 (MIT) is bundled in public/vercel-native-analytics.js. The source adapter lives in site-analytics/foundation/vercel-native.js. Bundle SHA256: 273d9074b0af1a1008766fdd17dd1b1ff74909bdcb4a0ff83396557fc4c6a604. Production origin: https://learn-gray-ten.vercel.app. Baseline deployment: dpl_GpDgPHhTBPNdG34rb4aeTyjGybzQ; source: 9e9b6209db882553c79cf295d21d367980afd6ee.

Only allowlisted public page paths are sent. Query strings, fragments, raw referrers, private inputs, custom events, identity calls and cookies are excluded. Existing PostHog remains independently configured. Local development and temporary preview origins send no Vercel pageviews. The shared opt-out, DNT and GPC are respected. No paid analytics tier, Speed Insights or session replay is enabled by this source change.

Production release, browser request and Vercel receipt are recorded separately in the fleet rollout evidence. Acceptance visits are QA traffic and cannot establish audience growth.
