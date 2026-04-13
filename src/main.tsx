import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    __lovableAppBooted?: boolean;
    __lovableRecoveryInProgress?: boolean;
  }
  const __BUILD_TIMESTAMP__: string;
}

const MODULE_LOAD_RETRY_KEY = "__lovable_module_retry_count__";
const BUILD_VERSION_KEY = "__socialify_build_version__";

const settleTasks = (tasks: Array<Promise<unknown>>) =>
  Promise.all(
    tasks.map((task) =>
      Promise.resolve(task).catch(() => undefined),
    ),
  );

const cleanupAllCaches = async () => {
  const tasks: Promise<unknown>[] = [];

  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          settleTasks(registrations.map((registration) => registration.unregister())),
        ),
    );
  }

  if ("caches" in window && window.caches.keys) {
    tasks.push(
      window.caches
        .keys()
        .then((keys) => settleTasks(keys.map((key) => window.caches.delete(key)))),
    );
  }

  await settleTasks(tasks);
};

// --- Forced update check on every app open ---
const checkForUpdates = async () => {
  const currentBuild = __BUILD_TIMESTAMP__;
  const storedBuild = localStorage.getItem(BUILD_VERSION_KEY);

  // First visit — just store
  if (!storedBuild) {
    localStorage.setItem(BUILD_VERSION_KEY, currentBuild);
    return;
  }

  // Same build — no update needed
  if (storedBuild === currentBuild) {
    // Still check server for a newer version (in background)
    try {
      const res = await fetch("/index.html", { cache: "no-store" });
      const html = await res.text();
      // If the served index.html references a different main JS chunk, force reload
      const currentScript = document.querySelector('script[type="module"][src*="main"]');
      if (currentScript) {
        const currentSrc = currentScript.getAttribute("src") || "";
        // Check if served HTML has a different entry script hash
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (match && match[1]) {
          const servedAsset = match[1];
          // Compare with what's currently loaded
          const loadedScripts = Array.from(document.querySelectorAll('script[src*="/assets/index-"]'));
          const isCurrentAsset = loadedScripts.some(s => s.getAttribute("src") === servedAsset);
          if (!isCurrentAsset) {
            console.log("[Socialify] New version detected from server, reloading...");
            await cleanupAllCaches();
            localStorage.setItem(BUILD_VERSION_KEY, Date.now().toString());
            window.location.reload();
            return;
          }
        }
      }
    } catch (e) {
      // Network error, skip background check
    }
    return;
  }

  // Different build version — new deploy detected
  console.log("[Socialify] Build version changed, updating app...");
  localStorage.setItem(BUILD_VERSION_KEY, currentBuild);
  await cleanupAllCaches();
  // No need to reload here — we're already running the new version
};

void cleanupAllCaches();
void checkForUpdates();

try {
  sessionStorage.removeItem(MODULE_LOAD_RETRY_KEY);
} catch (_) {}

const url = new URL(window.location.href);
const redirectPath = url.searchParams.get("__redirect");

if (redirectPath) {
  window.history.replaceState(null, "", redirectPath);
} else if (url.searchParams.has("__reload")) {
  url.searchParams.delete("__reload");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (rootElement.childElementCount > 0 || rootElement.textContent?.trim()) {
      window.__lovableAppBooted = true;
      window.__lovableRecoveryInProgress = false;
    }
  });
});
