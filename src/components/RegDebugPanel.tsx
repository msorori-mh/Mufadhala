import { useState } from "react";
import type { RegistrationDraft } from "@/lib/registrationDraft";

export interface DebugEvent {
  time: string;
  label: string;
  detail?: string;
}

interface Props {
  form: RegistrationDraft;
  events: DebugEvent[];
  mountCount: number;
  viewportH: number;
}

const RegDebugPanel = ({ form, events, mountCount, viewportH }: Props) => {
  const [open, setOpen] = useState(false);

  // Only show in dev
  if (import.meta.env.PROD) return null;

  const ts = () => new Date().toLocaleTimeString("en", { hour12: false, fractionalSecondDigits: 3 });

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999, fontSize: 10, direction: "ltr", textAlign: "left" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "#f00", color: "#fff", padding: "2px 8px", fontSize: 11, borderRadius: "4px 4px 0 0" }}
      >
        {open ? "▼ DEBUG" : "▲ DEBUG"}
      </button>
      {open && (
        <div style={{ background: "#111", color: "#0f0", padding: 6, maxHeight: 220, overflowY: "auto", fontFamily: "monospace" }}>
          <div style={{ color: "#ff0" }}>mounts: {mountCount} | vH: {viewportH}</div>
          <div style={{ borderBottom: "1px solid #333", paddingBottom: 3, marginBottom: 3 }}>
            <strong style={{ color: "#0ff" }}>STATE:</strong>
            {Object.entries(form).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: v ? "#0f0" : "#f55" }}>{k}</span>: "{v}"
              </div>
            ))}
          </div>
          <div>
            <strong style={{ color: "#0ff" }}>EVENTS (last 30):</strong>
            {events.slice(-30).reverse().map((e, i) => (
              <div key={i} style={{ color: e.label.includes("CLEAR") || e.label.includes("OVERWRITE") ? "#f55" : "#0f0" }}>
                [{e.time}] {e.label} {e.detail || ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegDebugPanel;
