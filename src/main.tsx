import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Support static hosts that serve /404.html for unknown routes.
// /404.html redirects to /?__redirect=<originalPath>
const params = new URLSearchParams(window.location.search);
const redirectPath = params.get("__redirect");
if (redirectPath) {
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")!).render(<App />);
