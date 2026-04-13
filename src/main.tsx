import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Detect recovery session BEFORE Supabase strips the hash
(() => {
  const hash = window.location.hash;
  if (hash && hash.includes("type=recovery")) {
    sessionStorage.setItem("supabase_recovery_mode", "true");
  }
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="mufadhala-theme">
    <App />
  </ThemeProvider>
);
