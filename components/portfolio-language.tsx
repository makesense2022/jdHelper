'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __portfolioLanguageHydrated?: boolean;
  }
}

/** Load the site's public language resources only after React mounts. */
export default function PortfolioLanguage() {
  useEffect(() => {
    window.__portfolioLanguageHydrated = true;
    window.dispatchEvent(new Event('portfolio-language:hydrated'));

    if (document.getElementById('portfolio-language-runtime')) return;

    const script = document.createElement('script');
    script.id = 'portfolio-language-runtime';
    script.src = '/portfolio-language.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
