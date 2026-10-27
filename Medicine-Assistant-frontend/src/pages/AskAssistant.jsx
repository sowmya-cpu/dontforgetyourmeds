import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getMedicinesByUser } from "../database/medicineDB";
const API_URL = "http://localhost:8080/api/prescription-ai/ask";
 
 
// Leave time for the backend to return its own timeout response.
const REQUEST_TIMEOUT_MS = 110000;
const REQUEST_TIMEOUT_SECONDS = REQUEST_TIMEOUT_MS / 1000;
 
async function getSavedMedicines() {
  const email = localStorage.getItem("email")?.trim().toLowerCase();

  if (!email) {
    throw new Error("Please log in again.");
  }

  const medicines = await getMedicinesByUser(email);

  return Array.isArray(medicines) ? medicines : [];
}
 
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
 
function findMedicineFromQuestion(question, medicines) {
  const normalizedQuestion = normalizeText(question);
 
  return [...medicines]
    .filter((medicine) => medicine.medicineName?.trim())
    .sort(
      (a, b) =>
        b.medicineName.trim().length - a.medicineName.trim().length
    )
    .find((medicine) => {
      const normalizedName = normalizeText(medicine.medicineName);
 
      const medicineNameWithoutPrefix = normalizedName.replace(
        /^(tab|tablet|cap|capsule)\s+/,
        ""
      );
 
      return (
        normalizedQuestion.includes(normalizedName) ||
        (medicineNameWithoutPrefix &&
          normalizedQuestion.includes(medicineNameWithoutPrefix))
      );
    });
}
 
function isGreeting(question) {
  const text = normalizeText(question);
 
  return /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|thanks|thank you)$/.test(
    text
  );
}
 
function asksForAllMedicines(question) {
  const text = normalizeText(question);
 
  return (
    /\b(all|every|list)\b/.test(text) &&
    /\b(medicines|medicine|medications|medication|drugs)\b/.test(text)
  );
}
 
function asksForMedicineImage(question) {
  const text = normalizeText(question);
 
  // Only treat explicit photo or appearance requests as image requests.
  // "What does Amlodipine do?" should be answered by Gemini.
  return (
    /\b(show|display|see|view|picture|photo|image|appearance|identify|recognize)\b/.test(
      text
    ) ||
    /\b(what does it look like|what does .* look like|how does it look|how does .* look)\b/.test(
      text
    )
  );
}
 
function MedicinePhoto({ medicine }) {
  const [imageUrl, setImageUrl] = useState("");
 
  useEffect(() => {
  const blob = medicine?.medicineImageBlob || medicine?.medicineImage;
 
    if (!(blob instanceof Blob) || blob.size === 0) {
      setImageUrl("");
      return undefined;
    }
 
    const url = URL.createObjectURL(blob);
 
    setImageUrl(url);
 
    return () => URL.revokeObjectURL(url);
  }, [medicine]);
 
  if (!imageUrl) {
    return (
      <div className="alert alert-warning mt-2 mb-0">
        No photo is saved for this medicine yet. Open My Medicines and upload
        its photo.
      </div>
    );
  }
 
  return (
    <div className="mt-3">
      <img
        src={imageUrl}
        alt={`Uploaded photo of ${medicine.medicineName}`}
        className="img-fluid rounded-3 border"
        style={{
          maxWidth: "320px",
          maxHeight: "320px",
          objectFit: "contain",
          backgroundColor: "#ffffff",
        }}
      />
 
      <div className="small text-muted mt-2">
        Your saved medicine photo
      </div>
    </div>
  );
}
 
function MedicineCard({ medicine }) {
  return (
    <div className="mt-3">
      <h5>{medicine.medicineName}</h5>
 
      <p className="mb-1">
        <strong>Strength:</strong> {medicine.strength || "Not recorded"}
      </p>
 
      <p className="mb-1">
        <strong>Dosage:</strong> {medicine.dosage || "Not recorded"}
      </p>
 
      <p className="mb-1">
        <strong>Frequency:</strong> {medicine.frequency || "Not recorded"}
      </p>
 
      <p className="mb-1">
        <strong>Instructions:</strong>{" "}
        {medicine.instructions || "Not recorded"}
      </p>
 
      <p className="mb-1">
        <strong>Duration:</strong> {medicine.duration || "Not recorded"}
      </p>
 
      <MedicinePhoto medicine={medicine} />
    </div>
  );
}
 
function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
 
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your Medicine Assistant. How can I help you today?",
    },
  ]);
 
  const messagesEndRef = useRef(null);
  const activeControllerRef = useRef(null);
  const mountedRef = useRef(false);
 
  // Abort an active request when this component unmounts.
  useEffect(() => {
    mountedRef.current = true;
 
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);
 
  // Automatically scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);
 
  async function handleSend(event) {
    event.preventDefault();
 
    const userQuestion = question.trim();
 
    if (!userQuestion || loading) {
      return;
    }
 
    setQuestion("");
 
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: userQuestion,
      },
    ]);
 
    setLoading(true);
 
    let controller = null;
    let timeoutId = null;
    let timedOut = false;
 
    try {
      // Handle greetings locally without calling Gemini.
      if (isGreeting(userQuestion)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: "Hello! I'm here to help you with your saved medicines and recorded instructions. What would you like to know?",
          },
        ]);
 
        return;
      }
 
      // Read medicines stored locally in IndexedDB.
      const medicines = await getSavedMedicines();
 
      if (!mountedRef.current) {
        return;
      }
 
      const matchedMedicine = findMedicineFromQuestion(
        userQuestion,
        medicines
      );
 
      // Show all saved medicines locally.
      if (asksForAllMedicines(userQuestion)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: medicines.length
              ? "Here are your saved medicines."
              : "You don't have any saved medicines yet.",
            medicines,
          },
        ]);
 
        return;
      }
 
      // Show a saved medicine photo locally without calling Gemini.
      if (matchedMedicine && asksForMedicineImage(userQuestion)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: `Here is your saved ${matchedMedicine.medicineName} medicine information.`,
            medicine: matchedMedicine,
          },
        ]);
 
        return;
      }
 
      // Send only the saved record relevant to this question, if any.
      const medicineContext = matchedMedicine
        ? [
            `Name: ${matchedMedicine.medicineName || "Not recorded"}`,
            `Strength: ${matchedMedicine.strength || "Not recorded"}`,
            `Dosage: ${matchedMedicine.dosage || "Not recorded"}`,
            `Frequency: ${matchedMedicine.frequency || "Not recorded"}`,
            `Instructions: ${matchedMedicine.instructions || "Not recorded"}`,
            `Duration: ${matchedMedicine.duration || "Not recorded"}`,
          ].join("\n")
        : "";
 
      // Create a controller for the Gemini request.
      controller = new AbortController();
      activeControllerRef.current = controller;
 
      // Abort only after the backend's configured response timeout.
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
 
      const token = localStorage.getItem("token");
 
      const response = await fetch(API_URL, {
        method: "POST",
 
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
 
        body: JSON.stringify({
          question: userQuestion,
          medicineContext,
        }),
 
        signal: controller.signal,
      });
 
      const responseText = await response.text();
 
      let data = {};
 
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error("The server returned an invalid response.");
        }
      }
 
      // Handle API errors explicitly.
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            data.error ||
              "The Gemini API quota or rate limit has been reached. Please wait for the quota to reset or check your Google AI Studio limits."
          );
        }
 
        if (response.status === 503) {
          throw new Error(
            data.error ||
              "The AI service is temporarily unavailable. Please try again later."
          );
        }
 
        if (response.status === 504) {
          throw new Error(
            data.error ||
              "The AI service took too long to respond. Please try again later."
          );
        }
 
        throw new Error(
          data.error || `Request failed with status ${response.status}.`
        );
      }
 
      if (!data.answer) {
        throw new Error("The assistant returned an empty answer.");
      }
 
      if (!mountedRef.current) {
        return;
      }
 
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.answer,
        },
      ]);
    } catch (error) {
      // Do not update the UI if the component has unmounted.
      if (!mountedRef.current) {
        return;
      }
 
      console.error("Assistant error:", error);
 
      let errorMessage;
 
      if (error?.name === "AbortError") {
        errorMessage = timedOut
          ? `The AI request took longer than ${REQUEST_TIMEOUT_SECONDS} seconds. Please try again later.`
          : "The request was cancelled. Please try again.";
      } else if (error instanceof TypeError) {
        errorMessage =
          "Unable to connect to the assistant backend. Check that it is running on port 8080 and try again.";
      } else {
        errorMessage =
          error?.message || "Something went wrong. Please try again.";
      }
 
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: errorMessage,
        },
      ]);
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
 
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
 
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }
 
  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-2">Ask Medicine Assistant</h2>
 
      <p className="text-muted">
        Ask about your medicines, recorded instructions, or saved medicine
        photos.
      </p>
 
      <div
        className="border rounded-3 p-3 mb-3"
        style={{
          height: "55vh",
          minHeight: "320px",
          overflowY: "auto",
          backgroundColor: "#f8f9fa",
        }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`d-flex mb-3 ${
              message.role === "user"
                ? "justify-content-end"
                : "justify-content-start"
            }`}
          >
            <div
              className="p-3 rounded-3"
              style={{
                maxWidth: "85%",
                minWidth: 0,
                overflowWrap: "anywhere",
                fontSize: "1rem",
 
                backgroundColor:
                  message.role === "user" ? "#0d6efd" : "#ffffff",
 
                color:
                  message.role === "user" ? "#ffffff" : "#212529",
 
                border:
                  message.role === "assistant"
                    ? "1px solid #dee2e6"
                    : "none",
              }}
            >
              <strong className="d-block mb-1">
                {message.role === "user" ? "You" : "Medicine Assistant"}
              </strong>
 
              <div className="assistant-response">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
 
              {message.medicine && (
                <>
                  <hr />
                  <MedicineCard medicine={message.medicine} />
                </>
              )}
 
              {Array.isArray(message.medicines) &&
                message.medicines.map((medicine, medicineIndex) => (
                  <div
                    key={`${
                      medicine.id || medicine.medicineName
                    }-${medicineIndex}`}
                  >
                    <hr />
                    <MedicineCard medicine={medicine} />
                  </div>
                ))}
            </div>
          </div>
        ))}
 
        {loading && (
          <p className="text-muted" role="status">
            Medicine Assistant is preparing your answer...
          </p>
        )}
 
        <div ref={messagesEndRef} />
      </div>
 
      <form onSubmit={handleSend}>
        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Ask about a medicine..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={loading}
            aria-label="Your question"
            autoComplete="off"
          />
 
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !question.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
 
      <style>{`
        .assistant-response {
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
 
        .assistant-response p {
          margin: 0 0 12px;
        }
 
        .assistant-response ul,
        .assistant-response ol {
          padding-left: 24px;
          margin: 8px 0 12px;
        }
 
        .assistant-response li {
          margin-bottom: 8px;
        }
 
        .assistant-response p:last-child {
          margin-bottom: 0;
        }
      `}</style>
 
      <small className="text-muted d-block mt-3">
        This assistant provides general information and is not a substitute for
        advice from your doctor or pharmacist. Do not change prescribed
        medicines based only on an AI response.
      </small>
    </div>
  );
}
 
export default AskAssistant;