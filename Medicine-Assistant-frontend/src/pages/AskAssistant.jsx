
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  getMedicinesByUser,
  getDoseHistoryForDate,
} from "../database/medicineDB";

const API_URL = "https://dontforgetyourmeds.onrender.com/api/prescription-ai/ask";

const REQUEST_TIMEOUT_MS = 110000;
const REQUEST_TIMEOUT_SECONDS = REQUEST_TIMEOUT_MS / 1000;

const SCHEDULE_SLOTS = [
  { name: "Morning", icon: "🌅" },
  { name: "Afternoon", icon: "☀️" },
  { name: "Night", icon: "🌙" },
];

async function getSavedMedicines() {
  const email = localStorage.getItem("email")?.trim().toLowerCase();
  const medicines = await getMedicinesByUser(email);
  return Array.isArray(medicines) ? medicines : [];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isMedicineActiveToday(medicine, today) {
  if (!medicine.startDate || !medicine.duration) {
    return false;
  }

  const start = new Date(`${medicine.startDate}T00:00:00`);

  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const duration = Number(medicine.duration);

  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  const end = new Date(start);
  const unit = (medicine.durationUnit || "Days").toLowerCase();

  if (unit.startsWith("day")) {
    end.setDate(end.getDate() + duration - 1);
  } else if (unit.startsWith("week")) {
    end.setDate(end.getDate() + duration * 7 - 1);
  } else if (unit.startsWith("month")) {
    end.setMonth(end.getMonth() + duration);
    end.setDate(end.getDate() - 1);
  } else {
    return false;
  }

  const startDate = getDateString(start);
  const endDate = getDateString(end);

  return today >= startDate && today <= endDate;
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

/*
 * Recognizes:
 * "my medicines"
 * "show my medicines"
 * "list all medicines"
 * "what medicines am I taking"
 *
 * Time-specific requests are handled separately.
 */
function asksForAllMedicines(question) {
  const text = normalizeText(question);

  const medicineWords =
    /\b(medicines|medicine|medications|medication|drugs)\b/;

  if (!medicineWords.test(text)) {
    return false;
  }

  const timeSpecificRequest = asksForTodaysMedicines(question);

  if (timeSpecificRequest) {
    return false;
  }

  return (
    /\b(all|every|list)\b/.test(text) ||
    /\bmy medicines\b/.test(text) ||
    /\bmy medication\b/.test(text) ||
    /\bmy medications\b/.test(text) ||
    /\bmy drugs\b/.test(text) ||
    /\bmedicines do i take\b/.test(text) ||
    /\bmedications do i take\b/.test(text) ||
    /\bwhat medicines do i have\b/.test(text) ||
    /\bwhich medicines do i have\b/.test(text) ||
    /\bshow medicines\b/.test(text) ||
    /\bshow my\b/.test(text)
  );
}

/*
 * Recognizes requests for today's schedule.
 * Examples:
 * "today's medicines"
 * "what should I take today"
 * "my morning medicines"
 * "what do I take tonight"
 */
function asksForTodaysMedicines(question) {
  const text = normalizeText(question);

  const timeWord =
    /\b(today|todays|tonight|morning|afternoon|night|evening|breakfast|lunch|dinner)\b/.test(
      text
    );

  const medicineOrAction =
    /\b(medicine|medicines|medication|medications|drug|drugs|take|taking|scheduled|schedule|dose|doses|should i|supposed to|need to|due)\b/.test(
      text
    );

  return timeWord && medicineOrAction;
}

function getRequestedTimeSlot(question) {
  const text = normalizeText(question);

  if (/\b(morning|breakfast)\b/.test(text)) {
    return "Morning";
  }

  if (/\b(afternoon|lunch)\b/.test(text)) {
    return "Afternoon";
  }

  if (/\b(night|tonight|evening|dinner)\b/.test(text)) {
    return "Night";
  }

  return null;
}

function asksForMedicineImage(question) {
  const text = normalizeText(question);

  return (
    /\b(show|display|see|view|picture|photo|image|appearance|identify|recognize)\b/.test(
      text
    ) ||
    /\b(what does it look like|what does .* look like|how does it look|how does .* look)\b/.test(
      text
    )
  );
}

/*
 * Displays the photo stored in medicineDB.js.
 * The existing medicineImage property is preserved.
 */
function MedicinePhoto({ medicine }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const image = medicine?.medicineImage;

    if (!(image instanceof Blob) || image.size === 0) {
      setImageUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(image);
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

function MedicineCard({ medicine, scheduleInfo }) {
  return (
    <div className="mt-3">
      <h5>{medicine.medicineName}</h5>

      <p className="mb-1">
        <strong>Strength:</strong>{" "}
        {medicine.strength || "Not recorded"}
      </p>

      <p className="mb-1">
        <strong>Dosage:</strong>{" "}
        {medicine.dose || "Not recorded"}{" "}
        {medicine.dose ? "unit(s)" : ""}
      </p>

      <p className="mb-1">
        <strong>Frequency:</strong>{" "}
        {medicine.frequency || "Not recorded"}
      </p>

      <p className="mb-1">
        <strong>Instructions:</strong>{" "}
        {[
          medicine.foodInstruction,
          ...(Array.isArray(medicine.timesOfDay)
            ? medicine.timesOfDay
            : []),
        ]
          .filter(Boolean)
          .join(" — ") || "Not recorded"}
      </p>

      <p className="mb-1">
        <strong>Duration:</strong>{" "}
        {medicine.duration
          ? `${medicine.duration} ${medicine.durationUnit || "Days"}`
          : "Not recorded"}
      </p>

      {scheduleInfo && (
        <>
          <p className="mb-1">
            <strong>Scheduled time:</strong>{" "}
            {scheduleInfo.timeOfDay}
          </p>

          <p className="mb-1">
            <strong>Dose status:</strong>{" "}
            {scheduleInfo.taken ? (
              <span className="text-success">Already marked as taken</span>
            ) : (
              <span className="text-warning">Not marked as taken</span>
            )}
          </p>
        </>
      )}

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
      text: "Hello! I'm your Medicine Assistant. You can ask me about your medicines, today's schedule, or a saved medicine photo.",
    },
  ]);

  const messagesEndRef = useRef(null);
  const activeControllerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /*
   * Builds today's schedule using the same date, duration,
   * and timesOfDay fields as TodaysSchedule.jsx.
   */
  async function getTodaysSchedule() {
    const today = getToday();
    const email = localStorage.getItem("email")?.trim().toLowerCase();
    const [allMedicines, history] = await Promise.all([
      getMedicinesByUser(email),
      getDoseHistoryForDate(today),
    ]);

    const activeMedicines = allMedicines.filter((medicine) =>
      isMedicineActiveToday(medicine, today)
    );

    const schedule = activeMedicines.flatMap((medicine) => {
      const times = Array.isArray(medicine.timesOfDay)
        ? medicine.timesOfDay
        : [];

      return times.map((timeOfDay) => {
        const historyRecord = history.find(
          (item) =>
            item.medicineId === medicine.id &&
            item.timeOfDay === timeOfDay &&
            item.status === "taken"
        );

        return {
          medicine,
          timeOfDay,
          taken: Boolean(historyRecord),
        };
      });
    });

    return schedule;
  }

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
      if (isGreeting(userQuestion)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: "Hello! I'm here to help you with your saved medicines and today's schedule. What would you like to know?",
          },
        ]);

        return;
      }

      const medicines = await getSavedMedicines();

      if (!mountedRef.current) {
        return;
      }

      const matchedMedicine = findMedicineFromQuestion(
        userQuestion,
        medicines
      );

      /*
       * 1. Show all saved medicines.
       * Handles "my medicines", "show my medicines",
       * and "list all medicines".
       */
      if (asksForAllMedicines(userQuestion)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: medicines.length
              ? `You have ${medicines.length} saved medicine record(s). Here are your medicines.`
              : "You don't have any saved medicines yet.",
            medicines,
          },
        ]);

        return;
      }

      /*
       * 2. Show today's medicines or a requested time slot.
       * Handles "today's medicines", "what should I take today",
       * and "my morning medicines".
       */
      if (asksForTodaysMedicines(userQuestion)) {
        const schedule = await getTodaysSchedule();

        if (!mountedRef.current) {
          return;
        }

        const requestedSlot = getRequestedTimeSlot(userQuestion);

        const filteredSchedule = requestedSlot
          ? schedule.filter(
              (item) => item.timeOfDay === requestedSlot
            )
          : schedule;

        if (filteredSchedule.length === 0) {
          const message = requestedSlot
            ? `You have no medicines scheduled for ${requestedSlot.toLowerCase()} today according to your saved schedule.`
            : "You have no medicines scheduled for today according to your saved start dates, durations, and time selections.";

          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text: message,
            },
          ]);

          return;
        }

        const groupedSchedule = SCHEDULE_SLOTS.filter((slot) =>
          filteredSchedule.some(
            (item) => item.timeOfDay === slot.name
          )
        )
          .map((slot) => {
            const slotMedicines = filteredSchedule.filter(
              (item) => item.timeOfDay === slot.name
            );

            return `${slot.icon} **${slot.name}**\n${slotMedicines
              .map(
                (item) =>
                  `- ${item.medicine.medicineName} — ${item.medicine.dose || "Dose not recorded"} unit(s) — ${
                    item.taken ? "Already marked as taken" : "Not marked as taken"
                  }`
              )
              .join("\n")}`;
          })
          .join("\n\n");

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: requestedSlot
              ? `Here is your ${requestedSlot.toLowerCase()} medicine schedule for today:\n\n${groupedSchedule}`
              : `Here are your medicines scheduled for today:\n\n${groupedSchedule}`,
            scheduledMedicines: filteredSchedule,
          },
        ]);

        return;
      }

      /*
       * 3. Show a specific medicine's saved photo.
       */
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

      /*
       * 4. Send a specific medicine's information to Gemini.
       */
      const medicineContext = matchedMedicine
        ? [
            `Name: ${matchedMedicine.medicineName || "Not recorded"}`,
            `Strength: ${matchedMedicine.strength || "Not recorded"}`,
            `Dosage: ${matchedMedicine.dose || "Not recorded"}`,
            `Frequency: ${matchedMedicine.frequency || "Not recorded"}`,
            `Instructions: ${matchedMedicine.foodInstruction || "Not recorded"}`,
            `Duration: ${matchedMedicine.duration || "Not recorded"}`,
            `Scheduled times: ${
              Array.isArray(matchedMedicine.timesOfDay)
                ? matchedMedicine.timesOfDay.join(", ")
                : "Not recorded"
            }`,
          ].join("\n")
        : "";

      controller = new AbortController();
      activeControllerRef.current = controller;

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

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            data.error ||
              "The Gemini API quota or rate limit has been reached. Please try again later."
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
        Ask about your medicines, today's schedule, recorded instructions,
        or saved medicine photos.
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
                    key={`${medicine.id || medicine.medicineName}-${medicineIndex}`}
                  >
                    <hr />
                    <MedicineCard medicine={medicine} />
                  </div>
                ))}

              {Array.isArray(message.scheduledMedicines) &&
                message.scheduledMedicines.map((item, medicineIndex) => (
                  <div
                    key={`${item.medicine.id}-${item.timeOfDay}-${medicineIndex}`}
                  >
                    <hr />
                    <MedicineCard
                      medicine={item.medicine}
                      scheduleInfo={item}
                    />
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
            placeholder="Ask about your medicines..."
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
        This assistant provides general information and is not a substitute
        for advice from your doctor or pharmacist. Do not change prescribed
        medicines based only on an AI response.
      </small>
    </div>
  );
}
 
export default AskAssistant;