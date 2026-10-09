import React from "react";

function AskAssistant() {
  return (
    <div className="container py-4">

      <h2 className="fw-bold mb-2">
        Ask Medicine Assistant
      </h2>

      <p className="text-muted">
        Hello! I'm your Medicine Assistant. Ask me about your medicines,
        dosage schedules, and reminders.
      </p>

      <small className="text-muted">
        I provide information based on your saved medicine details and do not
        replace advice from your doctor or pharmacist.
      </small>

    </div>
  );
}

export default AskAssistant;