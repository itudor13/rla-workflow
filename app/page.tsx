"use client";

import { useState, useEffect } from "react";
import {
  FIELDS,
  emptyFields,
  FMT,
  ADD_DAYS,
  type FieldDef,
  type ListingFields,
} from "@/lib/fields";
import { AGENTS, DEFAULT_AGENT } from "@/lib/agents";

// ── Styles ──────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: 520,
    margin: "0 auto",
    padding: "16px 16px 80px",
    minHeight: "100vh",
    color: "#2C2825",
  } as const,
  header: { textAlign: "center" as const, marginBottom: 28, paddingTop: 8 },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 26,
    fontWeight: 400,
    margin: 0,
    color: "#2C2825",
    letterSpacing: "-0.01em",
  } as const,
  subtitle: { fontSize: 13, color: "#8C8580", margin: "4px 0 0" } as const,
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #E8E4E0",
    marginBottom: 16,
  } as const,
  choiceBtn: (active: boolean) => ({
    flex: 1,
    padding: "18px 12px",
    borderRadius: 10,
    border: active ? "2px solid #C4613A" : "2px solid #E8E4E0",
    background: active ? "#FDF6F3" : "#fff",
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "all 0.15s ease",
  }),
  choiceIcon: { fontSize: 28, marginBottom: 6, display: "block" } as const,
  choiceLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#2C2825",
    display: "block",
  } as const,
  choiceDesc: {
    fontSize: 11,
    color: "#8C8580",
    display: "block",
    marginTop: 2,
  } as const,
  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    border: "2px solid #E8E4E0",
    borderRadius: 8,
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    background: "#FAFAF8",
    lineHeight: 1.5,
    outline: "none",
  } as const,
  label: (req: boolean | undefined, empty: boolean) => ({
    fontSize: 12,
    fontWeight: 600,
    color: req && empty ? "#C44B3A" : "#6B6560",
    marginBottom: 4,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 4,
  }),
  input: (req: boolean | undefined, empty: boolean) => ({
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    border: `2px solid ${req && empty ? "#E8B4AD" : "#E8E4E0"}`,
    borderRadius: 8,
    boxSizing: "border-box" as const,
    background: req && empty ? "#FFF8F7" : "#FAFAF8",
    outline: "none",
    transition: "border-color 0.15s",
  }),
  primaryBtn: (disabled: boolean) => ({
    width: "100%",
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    background: disabled ? "#C4B5A8" : "#C4613A",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: disabled ? ("not-allowed" as const) : ("pointer" as const),
    transition: "all 0.15s",
    letterSpacing: "0.01em",
  }),
  secondaryBtn: {
    width: "100%",
    padding: "14px 24px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    background: "transparent",
    color: "#8C8580",
    border: "2px solid #E8E4E0",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 8,
  } as const,
  badge: (filled: boolean) => ({
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
    background: filled ? "#E8F5EA" : "#FDECEA",
    color: filled ? "#3D7C47" : "#C44B3A",
    marginLeft: 6,
  }),
  reviewField: { padding: "10px 0", borderBottom: "1px solid #F0ECE8" } as const,
  reviewLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8C8580",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as const,
  reviewValue: (filled: boolean) => ({
    fontSize: 16,
    fontWeight: filled ? 600 : 400,
    color: filled ? "#2C2825" : "#C4B5A8",
    marginTop: 2,
    wordBreak: "break-word" as const,
  }),
  alert: (type: "error" | "success" | "warning") => ({
    padding: "12px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    background:
      type === "error" ? "#FFF5F4" : type === "success" ? "#F2FAF3" : "#FFF9F0",
    border: `1px solid ${
      type === "error" ? "#EBBFBA" : type === "success" ? "#B8DFC0" : "#EFDFBF"
    }`,
    color: type === "error" ? "#9B3530" : type === "success" ? "#2A6B35" : "#8B6B2F",
  }),
  progress: {
    display: "flex" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 24,
  },
  step: (active: boolean, done: boolean) => ({
    width: 32,
    height: 4,
    borderRadius: 2,
    background: done ? "#3D7C47" : active ? "#C4613A" : "#E8E4E0",
    transition: "all 0.3s",
  }),
};

// ── Components ──────────────────────────────────────────
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (k: keyof ListingFields, v: string) => void;
}) {
  const empty = !value || value.trim() === "";
  return (
    <div style={{ gridColumn: field.wide ? "1 / -1" : "auto", marginBottom: 14 }}>
      <label style={S.label(field.required, empty)}>
        {field.label}
        {field.required && <span style={{ color: "#C44B3A" }}>*</span>}
      </label>
      {field.key === "SpecialTerms" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          style={{
            ...S.input(field.required, empty),
            resize: "vertical",
            minHeight: 60,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          readOnly={field.computed}
          style={{
            ...S.input(field.required, empty),
            background: field.computed
              ? "#F0ECE8"
              : S.input(field.required, empty).background,
          }}
        />
      )}
    </div>
  );
}

function ReviewField({
  field,
  value,
  editing,
  onEdit,
  onChange,
  onBlur,
}: {
  field: FieldDef;
  value: string;
  editing: boolean;
  onEdit: (k: keyof ListingFields) => void;
  onChange: (k: keyof ListingFields, v: string) => void;
  onBlur: () => void;
}) {
  const filled = !!value && value.trim() !== "";
  const display =
    field.key === "ListPrice" && filled ? `$${Number(value).toLocaleString()}` : value;

  return (
    <div style={S.reviewField}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={S.reviewLabel}>
          {field.label}
          {field.required && !filled && <span style={S.badge(false)}>Required</span>}
          {filled && field.required && <span style={S.badge(true)}>✓</span>}
        </span>
        {!field.computed && !editing && (
          <button
            onClick={() => onEdit(field.key)}
            style={{
              fontSize: 11,
              color: "#C4613A",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => e.key === "Enter" && onBlur()}
          style={{ ...S.input(false, false), marginTop: 4, fontSize: 16 }}
        />
      ) : (
        <div style={S.reviewValue(filled)}>{filled ? display : "—"}</div>
      )}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<
    "start" | "freeform" | "form" | "review" | "confirm" | "done"
  >("start");
  const [inputMode, setInputMode] = useState<"free" | "form" | null>(null);
  const [freeText, setFreeText] = useState("");
  const [fields, setFields] = useState<ListingFields>(emptyFields());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof ListingFields | null>(null);
  const [envelopeId, setEnvelopeId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEFAULT_AGENT.id);
  const [returnInfo, setReturnInfo] = useState<{
    event: string;
    address?: string;
    email?: string;
  } | null>(null);

  // Handle the redirect back from DocuSign's document preview. Restore the
  // listing (state was lost on the redirect) and show the confirm screen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ds_return") !== "1") return;
    try {
      const stashed = JSON.parse(sessionStorage.getItem("rla_pending") || "{}");
      if (stashed.fields) setFields(stashed.fields);
      if (stashed.agentId) setSelectedAgentId(stashed.agentId);
      if (stashed.envelopeId) setEnvelopeId(stashed.envelopeId);
      setScreen(stashed.envelopeId ? "confirm" : "start");
    } catch {
      setScreen("start");
    }
    // Clean the URL so a refresh doesn't replay this state.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Auto-calc end date when start or term changes
  useEffect(() => {
    if (fields.ListingStartDate && fields.ListingTermDays) {
      const parts = fields.ListingStartDate.split("/");
      if (parts.length === 3) {
        const start = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
        if (!isNaN(start.getTime())) {
          const end = ADD_DAYS(start, parseInt(fields.ListingTermDays) || 180);
          const newEnd = FMT(end);
          if (newEnd !== fields.ListingEndDate) {
            setFields((f) => ({ ...f, ListingEndDate: newEnd }));
          }
        }
      }
    }
  }, [fields.ListingStartDate, fields.ListingTermDays, fields.ListingEndDate]);

  // Auto-mirror buy-side commission to sell-side when sell-side is empty
  useEffect(() => {
    if (fields.CommissionBuySide && !fields.CommissionSellSide) {
      setFields((f) => ({ ...f, CommissionSellSide: f.CommissionBuySide }));
    }
  }, [fields.CommissionBuySide, fields.CommissionSellSide]);

  const updateField = (key: keyof ListingFields, val: string) =>
    setFields((f) => ({ ...f, [key]: val }));

  const requiredFilled = FIELDS.filter((f) => f.required).every(
    (f) => fields[f.key] && fields[f.key].trim() !== ""
  );

  const filledCount = FIELDS.filter(
    (f) => f.required && fields[f.key] && fields[f.key].trim() !== ""
  ).length;
  const requiredCount = FIELDS.filter((f) => f.required).length;

  const extractFields = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extract failed");
      const merged: ListingFields = { ...emptyFields() };
      for (const [k, v] of Object.entries(data.fields as Record<string, string>)) {
        if (k in merged && v !== "" && v != null) {
          (merged as unknown as Record<string, string>)[k] = String(v);
        }
      }
      setFields(merged);
      setScreen("review");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't extract fields. Try again or switch to manual entry."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 1: build the draft and open the mobile-friendly filled-document
  // preview. Nothing is sent to the seller yet.
  const previewEnvelope = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          agentId: selectedAgentId,
          returnUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail =
          data.details?.message ||
          (typeof data.details === "string" ? data.details : "") ||
          data.error ||
          "Could not build the document";
        throw new Error(detail);
      }
      // Persist the listing so we can restore it after the DocuSign redirect.
      try {
        sessionStorage.setItem(
          "rla_pending",
          JSON.stringify({
            envelopeId: data.envelopeId,
            fields,
            agentId: selectedAgentId,
          })
        );
      } catch {
        /* ignore storage errors */
      }
      if (data.previewUrl) {
        window.location.href = data.previewUrl;
        return;
      }
      // Fallback: no preview URL — go straight to confirm.
      setEnvelopeId(data.envelopeId);
      setScreen("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build the document.");
      setLoading(false);
    }
  };

  // Step 2a: the agent reviewed the filled doc and approves — send to seller.
  const finalizeSend = async () => {
    if (!envelopeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelopeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send");
      try {
        sessionStorage.removeItem("rla_pending");
      } catch {
        /* ignore */
      }
      setReturnInfo({ event: "send", address: fields.PropertyAddress, email: fields.OwnerEmail });
      setScreen("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: the agent spotted an error — discard the draft and go back to edit.
  const backToEdit = async () => {
    const id = envelopeId;
    setEnvelopeId(null);
    try {
      sessionStorage.removeItem("rla_pending");
    } catch {
      /* ignore */
    }
    setScreen("review");
    if (id) {
      // Best-effort cleanup of the discarded draft.
      fetch("/api/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelopeId: id }),
      }).catch(() => {});
    }
  };

  const reset = () => {
    setScreen("start");
    setInputMode(null);
    setFreeText("");
    setFields(emptyFields());
    setError(null);
    setEnvelopeId(null);
    setEditingField(null);
    setReturnInfo(null);
    setSelectedAgentId(DEFAULT_AGENT.id);
  };

  const stepIndex =
    screen === "start" || screen === "freeform" || screen === "form"
      ? 0
      : screen === "review"
      ? 1
      : 2;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <h1 style={S.title}>Listing Agreement</h1>
        <p style={S.subtitle}>Prefill and send a CAR RLA in seconds</p>
      </div>

      <div style={S.progress}>
        <div style={S.step(stepIndex === 0, stepIndex > 0)} />
        <div style={S.step(stepIndex === 1, stepIndex > 1)} />
        <div style={S.step(stepIndex === 2, false)} />
      </div>

      {error && <div style={S.alert("error")}>{error}</div>}

      {/* ── Screen: Start ── */}
      {screen === "start" && (
        <>
          <div style={S.card}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 14,
                color: "#2C2825",
              }}
            >
              How do you want to enter the listing details?
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={S.choiceBtn(inputMode === "free")}
                onClick={() => setInputMode("free")}
              >
                <span style={S.choiceIcon}>💬</span>
                <span style={S.choiceLabel}>Type it out</span>
                <span style={S.choiceDesc}>Just describe the listing</span>
              </button>
              <button
                style={S.choiceBtn(inputMode === "form")}
                onClick={() => setInputMode("form")}
              >
                <span style={S.choiceIcon}>📋</span>
                <span style={S.choiceLabel}>Fill in fields</span>
                <span style={S.choiceDesc}>Enter each detail directly</span>
              </button>
            </div>
          </div>
          <button
            style={S.primaryBtn(!inputMode)}
            disabled={!inputMode}
            onClick={() => setScreen(inputMode === "free" ? "freeform" : "form")}
          >
            Continue
          </button>
        </>
      )}

      {/* ── Screen: Freeform ── */}
      {screen === "freeform" && (
        <>
          <div style={S.card}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                color: "#2C2825",
              }}
            >
              Describe the listing
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#8C8580",
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              Include the address, seller name and email, price, term, and commission.
              Don't worry about formatting — just get the info down.
            </div>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={
                'e.g. "List 1234 Maple Ave Pasadena 91101 for $1.85M. 180 days, 2.5% buy side. Seller is Jane Smith jane@email.com 626-555-1212. SFR 4bed 3bath."'
              }
              style={S.textarea}
            />
          </div>
          <button
            style={S.primaryBtn(loading || !freeText.trim())}
            disabled={loading || !freeText.trim()}
            onClick={extractFields}
          >
            {loading ? "Reading your listing..." : "Extract & Review"}
          </button>
          <button style={S.secondaryBtn} onClick={() => setScreen("start")}>
            ← Back
          </button>
        </>
      )}

      {/* ── Screen: Form ── */}
      {screen === "form" && (
        <>
          <div style={S.card}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
                color: "#2C2825",
              }}
            >
              Listing Details
            </div>
            <div style={{ fontSize: 12, color: "#8C8580", marginBottom: 16 }}>
              Fill in what you know. Fields marked * are required.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
              {FIELDS.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={fields[f.key]}
                  onChange={updateField}
                />
              ))}
            </div>
          </div>
          <button style={S.primaryBtn(false)} onClick={() => setScreen("review")}>
            Review Before Sending
          </button>
          <button style={S.secondaryBtn} onClick={() => setScreen("start")}>
            ← Back
          </button>
        </>
      )}

      {/* ── Screen: Review ── */}
      {screen === "review" && (
        <>
          <div style={S.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2825" }}>
                Review Listing Agreement
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: requiredFilled ? "#3D7C47" : "#C44B3A",
                }}
              >
                {filledCount}/{requiredCount} required
              </span>
            </div>

            {!requiredFilled && (
              <div style={S.alert("warning")}>
                Fill in all required fields before sending. Tap "Edit" on any field to
                update it.
              </div>
            )}

            {FIELDS.map((f) => (
              <ReviewField
                key={f.key}
                field={f}
                value={fields[f.key]}
                editing={editingField === f.key}
                onEdit={(k) => setEditingField(k)}
                onChange={updateField}
                onBlur={() => setEditingField(null)}
              />
            ))}

            {/* Listing agent (counter-signer) selector */}
            <div style={{ ...S.reviewField, borderBottom: "none", paddingTop: 14 }}>
              <span style={S.reviewLabel}>Listing Agent (counter-signs)</span>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{
                  ...S.input(false, false),
                  marginTop: 6,
                  fontSize: 16,
                  cursor: "pointer",
                  appearance: "auto",
                }}
              >
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#8C8580",
              textAlign: "center",
              marginBottom: 10,
              lineHeight: 1.4,
            }}
          >
            Next you'll see the fully filled document to proof-read.{" "}
            <strong>Nothing is sent to {fields.OwnerEmail || "the seller"}</strong>{" "}
            until you approve it on the next step. Auto-reminders kick in after 2
            days, then daily.
          </div>

          <button
            style={S.primaryBtn(loading || !requiredFilled)}
            disabled={loading || !requiredFilled}
            onClick={previewEnvelope}
          >
            {loading ? "Building document..." : "Preview Document"}
          </button>
          <button
            style={S.secondaryBtn}
            onClick={() => setScreen(inputMode === "free" ? "freeform" : "form")}
          >
            ← Go Back & Edit
          </button>
        </>
      )}

      {/* ── Screen: Confirm (after previewing the filled document) ── */}
      {screen === "confirm" && (
        <>
          <div style={S.card}>
            <div
              style={{
                fontSize: 18,
                fontFamily: "'DM Serif Display', serif",
                color: "#2C2825",
                marginBottom: 8,
              }}
            >
              Did the document look right?
            </div>
            <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
              If everything in the preview was correct, send it to{" "}
              <strong>{fields.OwnerEmail || "the seller"}</strong> for signature. If
              you spotted an error, go back and fix it — nothing has been sent yet.
            </div>
          </div>

          <button
            style={S.primaryBtn(loading)}
            disabled={loading}
            onClick={finalizeSend}
          >
            {loading ? "Sending..." : "Looks good — Send to Seller"}
          </button>
          <button style={S.secondaryBtn} onClick={backToEdit} disabled={loading}>
            ← I saw an error — Back & Edit
          </button>
        </>
      )}

      {/* ── Screen: Done ── */}
      {screen === "done" &&
        (() => {
          const sent = !returnInfo || returnInfo.event === "send";
          const addr = returnInfo?.address || fields.PropertyAddress;
          const email = returnInfo?.email || fields.OwnerEmail;
          return (
            <>
              <div style={S.card}>
                <div
                  style={{
                    fontSize: 22,
                    fontFamily: "'DM Serif Display', serif",
                    color: "#2C2825",
                    marginBottom: 8,
                  }}
                >
                  {sent ? "Sent!" : "Saved as draft"}
                </div>
                {sent ? (
                  <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
                    The listing agreement for <strong>{addr}</strong> has been emailed
                    to <strong>{email}</strong>. They'll get an automatic reminder
                    after 2 days, then daily until signed.
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
                    You left the review screen without sending, so{" "}
                    <strong>nothing was sent to the seller</strong>. The prefilled
                    agreement is saved in your DocuSign Drafts — you can finish and
                    send it there anytime, or start over here.
                  </div>
                )}
                {envelopeId && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#B0A9A3",
                      marginTop: 14,
                      fontFamily: "monospace",
                    }}
                  >
                    Envelope ID: {envelopeId}
                  </div>
                )}
              </div>
              <div style={S.alert(sent ? "success" : "warning")}>
                {sent
                  ? "You'll counter-sign as the agent once the seller has signed."
                  : "Tip: nothing reaches the seller until you click Send on the DocuSign review screen."}
              </div>
              <button style={S.primaryBtn(false)} onClick={reset}>
                Start New Listing
              </button>
            </>
          );
        })()}
    </div>
  );
}
