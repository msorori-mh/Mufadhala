import { useState } from "react";

interface FormState {
  firstName: string;
  fourthName: string;
  phoneNumber: string;
  governorate: string;
  universityId: string;
  collegeId: string;
  majorId: string;
  highSchoolGpa: string;
}

interface TraceEntry {
  ts: number;
  source: string;
  changed: string[];
  snapshot: FormState;
}

interface Props {
  form: FormState;
  validationChecks: Record<string, boolean>;
  isFormValid: boolean;
  loading: boolean;
  submitPhase: string;
  lastSource: string;
  mountCount: number;
  viewportH: number;
  kbVisible: boolean;
  traceLog: TraceEntry[];
}

export default function RegisterDebugPanel({
  form,
  validationChecks,
  isFormValid,
  loading,
  submitPhase,
  lastSource,
  mountCount,
  viewportH,
  kbVisible,
  traceLog,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-4" dir="ltr">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-xs bg-black/80 text-green-400 py-1 px-2 rounded font-mono"
      >
        {open ? "▼ Hide Debug" : "▶ Debug Panel v3.0"}
      </button>

      {open && (
        <div className="bg-black/90 text-green-300 text-[10px] font-mono p-2 rounded mt-1 max-h-[50vh] overflow-auto space-y-2">
          {/* Status */}
          <div>
            <div className="text-yellow-400 font-bold">── STATUS ──</div>
            <div>mounts: {mountCount} | viewport: {viewportH}px | kb: {kbVisible ? "OPEN" : "closed"}</div>
            <div>valid: {isFormValid ? "✅" : "❌"} | loading: {loading ? "⏳" : "—"} | phase: {submitPhase || "idle"}</div>
            <div>lastSource: {lastSource || "none"}</div>
          </div>

          {/* Form state */}
          <div>
            <div className="text-yellow-400 font-bold">── FORM STATE ──</div>
            {Object.entries(form).map(([k, v]) => (
              <div key={k}>
                <span className={validationChecks[k] === false ? "text-red-400" : ""}>
                  {k}: "{v}" {validationChecks[k] === false ? "❌" : validationChecks[k] === true ? "✅" : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Trace log */}
          <div>
            <div className="text-yellow-400 font-bold">── TRACE ({traceLog.length}) ──</div>
            {traceLog.slice(-20).map((t, i) => (
              <div key={i} className={t.changed.includes("firstName") || t.changed.includes("fourthName") ? "text-red-400" : ""}>
                {new Date(t.ts).toISOString().slice(11, 23)} [{t.source}] Δ{t.changed.join(",")}
                {(t.changed.includes("firstName") || t.changed.includes("fourthName")) && (
                  <span> fn="{t.snapshot.firstName}" ln="{t.snapshot.fourthName}"</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
