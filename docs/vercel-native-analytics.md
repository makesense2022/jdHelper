# Vercel Web Analytics

Official @vercel/analytics 2.0.1 (MIT), bundled with an explicit public-path and production-origin guard. Bundle SHA256: 9278e679f357ba5df26547357f0c92b53f7b8c6565e522ad8d5268dbbf4c9a60. Source adapter: site-analytics/foundation/vercel-native.js. Origin: https://learn-gray-ten.vercel.app. Source baseline: 52f260e35a5d56786cfee902b753fa3bde0fbc4d; served deployment: dpl_Dz1HdwFekmBSwW19n42pvDqDuX4K.

The official bundle is appended to the existing browser adapter, or loaded after React hydration by the existing root layout. Query strings, fragments and raw referrers are removed. No private input, identity call, Cookie or custom event is sent. DNT, GPC and the shared opt-out stop subsequent collection; previews and localhost are excluded. Existing PostHog code is preserved. No paid tier or Speed Insights is enabled.

Browser requests, Vercel receipt and deployment state are recorded separately in opt-20261011-015. Acceptance traffic is QA and does not establish organic growth.
