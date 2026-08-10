/**
 * Route preloading — makes lazy-loaded page transitions feel instant.
 *
 * Each route maps to the SAME dynamic import() that App.jsx uses for its
 * React.lazy() pages. Because React caches module instances after the first
 * import, calling preloadRoute() (e.g. on sidebar hover, or in idle time
 * after login) warms the chunk so the subsequent navigation renders without
 * the Suspense fallback spinner.
 */
const routeLoaders = {
  '/': () => import('../pages/Home'),
  '/dashboard': () => import('../pages/Dashboard'),
  '/login': () => import('../pages/SignupPage'),
  '/signup': () => import('../pages/SignupPage'),
  '/forgot-password': () => import('../pages/ForgotPasswordPage'),
  '/agent': () => import('../pages/AIFinanceAgent'),
  '/agent-activity': () => import('../pages/AgentActivity'),
  '/bill-upload': () => import('../pages/BillUpload'),
  '/bill/': () => import('../pages/BillDetails'),
  '/chat': () => import('../pages/ChatPage'),
  '/documents': () => import('../pages/DocumentAssistant'),
  '/invoices': () => import('../pages/Invoices'),
  '/compliance': () => import('../pages/ComplianceCenter'),
  '/penalty': () => import('../pages/PenaltyCenter'),
  '/health': () => import('../pages/BusinessHealth'),
  '/reports': () => import('../pages/Reports'),
  '/expenses': () => import('../pages/ExpenseAnalytics'),
  '/business': () => import('../pages/BusinessDirectory'),
  '/notifications': () => import('../pages/NotificationCenter'),
  '/pricing': () => import('../pages/PricingBilling'),
  '/settings': () => import('../pages/Settings'),
  '/support': () => import('../pages/Support'),
  '/profile': () => import('../pages/Profile'),
  '/search': () => import('../pages/GlobalSearch'),
  '/forecast': () => import('../pages/TaxForecast'),
  '/audit': () => import('../pages/AuditCenter'),
  '/insights': () => import('../pages/AIInsights'),
  '/recommendations': () => import('../pages/Recommendations'),
  '/gst-forms': () => import('../pages/GSTForms'),
  '/vendors': () => import('../pages/VendorIntelligence'),
  '/checkout': () => import('../pages/CheckoutPage'),
  '/payment-success': () => import('../pages/PaymentSuccess'),
};

// Track in-flight/pending preloads so we never fire the same import twice.
const preloaded = new Set();

/**
 * Warm up the lazy chunk for a route without navigating to it.
 * Safe to call repeatedly — the module is only fetched once.
 * @param {string} path - route path, e.g. '/dashboard'
 */
export const preloadRoute = (path) => {
  // Exact match first, then prefix match for dynamic routes like '/bill/:billId'.
  let loader = routeLoaders[path];
  if (!loader) {
    const prefix = Object.keys(routeLoaders).find(
      (key) => key.endsWith('/') && path.startsWith(key)
    );
    if (prefix) loader = routeLoaders[prefix];
  }
  if (!loader || preloaded.has(path)) return;
  preloaded.add(path);
  // Fire-and-forget; failures are irrelevant for a preload.
  loader().catch(() => {
    preloaded.delete(path); // allow retry on transient network failure
  });
};
