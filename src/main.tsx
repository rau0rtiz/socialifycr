import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const MODULE_LOAD_RETRY_KEY = "__lovable_module_retry_count__";

try {
  sessionStorage.removeItem(MODULE_LOAD_RETRY_KEY);
} catch (_) {}

// Support static hosts that serve /404.html for unknown routes.
// /404.html redirects to /?__redirect=<originalPath>
const url = new URL(window.location.href);
const redirectPath = url.searchParams.get("__redirect");

if (redirectPath) {
  window.history.replaceState(null, "", redirectPath);
} else if (url.searchParams.has("__reload")) {
  url.searchParams.delete("__reload");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

createRoot(document.getElementById("root")!).render(<App />);
