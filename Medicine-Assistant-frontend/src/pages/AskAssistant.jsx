
import React, { useState } from "react";
import { toast } from "react-toastify";

function AskAssistant() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your Medicine Assistant. Ask me about your saved medicines and schedule.",
    },
  ]);

  const quickQuestions = [
    "What medicines are scheduled for this morning?",
    "Which medicines should I take after food?",
    "Show my saved medicines",
  ];

  const sendMessage = (question = input) => {
    const text = question.trim();

    if (!text || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text },
    ]);

    setInput("");
    setLoading(true);

    // Temporary mock response for UI testing.
    setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "I received your question. Medicine schedule matching will be connected in the next step.",
        },
      ]);

      setLoading(false);
    }, 600);
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-circle bg-primary-subtle text-primary
          d-flex align-items-center justify-content-center"
          style={{ width: 52, height: 52 }}
        >
          <i className="bi bi-robot fs-3"></i>
        </div>

        <div>
          <h2 className="fw-bold mb-1">Ask Assistant</h2>
          <p className="text-muted mb-0">
            Get help with your saved medicine information
          </p>
        </div>
      </div>

      <div className="card shadow-sm">
        <div
          className="card-body d-flex flex-column gap-3"
          style={{ minHeight: 400, maxHeight: 500, overflowY: "auto" }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`d-flex ${
                message.role === "user"
                  ? "justify-content-end"
                  : "justify-content-start"
              }`}
            >
              <div
                className={`p-3 rounded-4 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-light text-dark border"
                }`}
                style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-muted small">
              Assistant is preparing a response...
            </div>
          )}
        </div>

        <div className="card-footer bg-white p-3">
          <p className="small text-muted mb-2">Quick questions</p>

          <div className="d-flex flex-wrap gap-2 mb-3">
            {quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={loading}
                onClick={() => sendMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form
            className="d-flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Ask about your medicines..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              className="btn btn-primary px-3"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      </div>

      <p className="text-muted small mt-3">
        Always follow your prescription. The assistant should not invent
        doses or change your prescribed treatment.
      </p>
    </div>
  );
}

export default AskAssistant;
