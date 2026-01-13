import React from "react";

const STEPS = ["OPEN","SENT_TO_KITCHEN","IN_PREP","READY","SERVED","PAID"];

export default function OrderTimeline({ status }) {
  const idx = STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {STEPS.map((s, i) => (
        <span key={s} className={`pill ${i <= idx ? "active" : ""}`}>
          {s}
        </span>
      ))}
    </div>
  );
}
