# Vercel Web Analytics

Official @vercel/analytics 2.0.1 (MIT), bundled with an explicit public-path and production-origin guard. Bundle SHA256: cef18f946f2af8a7dd49c258817e2998a863cb49647b2b5467fbfc1a4421fd8d. Source adapter: site-analytics/foundation/vercel-native.js. Origin: https://learn-gray-ten.vercel.app. Source baseline: 6aca0229dea601718f5438286e67460fc61e67e1; served deployment: dpl_9D2CAFCkbe3huyCPeWZ2AJKoTCkn.

The official bundle is appended to the existing browser adapter, or loaded after React hydration by the existing root layout. Query strings, fragments and raw referrers are removed. No private input, identity call, Cookie or custom event is sent. DNT, GPC and the shared opt-out stop subsequent collection; previews and localhost are excluded. Existing PostHog code is preserved. No paid tier or Speed Insights is enabled.

Browser requests, Vercel receipt and deployment state are recorded separately in opt-20261011-015. Acceptance traffic is QA and does not establish organic growth.
