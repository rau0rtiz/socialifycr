import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    __lovableAppBooted?: boolean;
    __lovableRecoveryInProgress?: boolean;
  }
}

const MODULE_LOAD_RETRY_KEY = "__lovable_module_retry_count__";

const settleTasks = (tasks: Array<Promise<unknown>>) =>
  Promise.all(
    tasks.map((task) =>
      Promise.resolve(task).catch(() => undefined),
    ),
  );

const cleanupLegacyRuntimeCaches = async () => {
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

void cleanupLegacyRuntimeCaches();

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
