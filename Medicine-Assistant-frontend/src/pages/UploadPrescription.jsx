import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWorker } from "tesseract.js";
import {
  saveMedicine,
  getAllMedicines,
  updateMedicine,
} from "../database/medicineDB";

const API_URL = "http://localhost:8080/api/prescription-ai/analyze";
const DATABASE_NAME = "MedicationAssistantPrescriptionDB";
const STORE_NAME = "prescriptions";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/* =========================================================
   DATABASE
========================================================= */

function openPrescriptionDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () =>
      reject(
        request.error ||
          new Error("Could not open local prescription storage.")
      );
  });
}

/* =========================================================
   IMAGE FINGERPRINT
   The same image produces the same SHA-256 fingerprint.
========================================================= */

async function calculateImageHash(blob) {
  if (!blob || typeof blob.arrayBuffer !== "function") {
    return null;
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Secure image verification is unavailable in this browser. Please use localhost or HTTPS."
    );
  }

  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/* =========================================================
   SAVE PRESCRIPTION WITHOUT DUPLICATING THE SAME IMAGE

   1. Calculate the image fingerprint.
   2. Find existing records with the same image.
   3. Reuse an existing ID when a match is found.
   4. Remove duplicate records for that image.
   5. Save the latest reviewed medicine details.
========================================================= */

async function savePrescriptionLocally(record) {
  if (!("indexedDB" in window)) {
    throw new Error(
      "This browser does not support local prescription storage."
    );
  }

  const imageHash = await calculateImageHash(record.imageBlob);
  const database = await openPrescriptionDatabase();

  try {
    // Read existing records before writing.
    const existingRecords = await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .getAll();

      request.onsuccess = () => resolve(request.result || []);

      request.onerror = () =>
        reject(
          request.error ||
            new Error("Could not check existing prescriptions.")
        );
    });

    const matchingRecords = [];

    // Check new records using their stored hash.
    // For older records without a hash, calculate it from their image.
    for (const existing of existingRecords) {
      let existingHash = existing.imageHash || null;

      if (!existingHash && existing.imageBlob) {
        try {
          existingHash = await calculateImageHash(
            existing.imageBlob
          );
        } catch (error) {
          console.warn(
            "Could not verify an older prescription image:",
            error
          );
        }
      }

      if (imageHash && existingHash === imageHash) {
        matchingRecords.push(existing);
      }
    }

    // Keep the original ID when the same image already exists.
    // Otherwise, create a new record.
    const existingMatch = matchingRecords[0];

    const recordToSave = {
      ...record,
      id: existingMatch ? existingMatch.id : record.id,
      imageHash,
      createdAt: existingMatch
        ? existingMatch.createdAt
        : record.createdAt,
    };

    // Update the existing record and remove duplicates atomically.
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite"
      );

      const store = transaction.objectStore(STORE_NAME);

      // Remove any additional records for the same image.
      matchingRecords.slice(1).forEach((duplicate) => {
        store.delete(duplicate.id);
      });

      // put() updates the existing record if its ID already exists.
      store.put(recordToSave);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error("Could not save the prescription.")
        );

      transaction.onabort = () =>
        reject(
          transaction.error ||
            new Error("Saving the prescription was cancelled.")
        );
    });

    return recordToSave;
  } finally {
    database.close();
  }
}

/* =========================================================
   PARSE GEMINI RESPONSE
========================================================= */

function parseGeminiResponse(result) {
  let parsed;

  try {
    parsed =
      typeof result === "string"
        ? JSON.parse(result)
        : result;
  } catch {
    throw new Error(
      "Gemini returned an invalid response. Please try again."
    );
  }

  if (!parsed || !Array.isArray(parsed.medicines)) {
    throw new Error(
      "Gemini's response does not contain a valid medicines array."
    );
  }

  return parsed.medicines.map((medicine, index) => {
    const normalized = {
      id: `medicine-${Date.now()}-${index}`,
      medicineName: String(medicine.medicineName ?? ""),
      strength: String(medicine.strength ?? ""),
      dosage: String(medicine.dosage ?? ""),
      frequency: String(medicine.frequency ?? ""),
      instructions: String(medicine.instructions ?? ""),
      duration: String(medicine.duration ?? ""),
    };

    const missingFields = [];

    if (!normalized.medicineName.trim()) {
      missingFields.push("medicine name");
    }

    if (!normalized.strength.trim()) {
      missingFields.push("strength");
    }

    if (!normalized.dosage.trim()) {
      missingFields.push("dosage");
    }

    if (!normalized.frequency.trim()) {
      missingFields.push("frequency");
    }

    if (!normalized.duration.trim()) {
      missingFields.push("duration");
    }

    return {
      ...normalized,
      missingFields,
      reviewRequired: missingFields.length > 0,
    };
  });
}

/* =========================================================
   UPLOAD PRESCRIPTION COMPONENT
========================================================= */

function UploadPrescription() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [hasConfirmedReview, setHasConfirmedReview] =
    useState(false);

  // Prevent multiple simultaneous save attempts.
  const saveLock = useRef(false);

  // Reuse the record ID throughout the current upload session.
  const currentPrescriptionId = useRef(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  /* =======================================================
     SELECT IMAGE
  ======================================================= */

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");
    setMedicines([]);
    setProgress(0);
    setHasConfirmedReview(false);

    currentPrescriptionId.current = null;

    if (!selectedFile) {
      setFile(null);
      setPreview("");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setFile(null);
      setPreview("");

      setError(
        "Please select a prescription image. PDF support will be added later."
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setPreview("");

      setError("Please select an image smaller than 10 MB.");

      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  /* =======================================================
     OCR + GEMINI ANALYSIS
  ======================================================= */

  const handleAnalyzePrescription = async () => {
    if (loading || saving) {
      return;
    }

    if (!file) {
      setError("Please upload a prescription image first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setMedicines([]);
    setHasConfirmedReview(false);
    setProgress(0);

    currentPrescriptionId.current = null;

    let worker;

    try {
      // Step 1: Extract text using Tesseract OCR.
      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(
              Math.round((message.progress || 0) * 100)
            );
          }
        },
      });

      const ocrResult = await worker.recognize(file);
      const ocrText = ocrResult.data.text.trim();

      if (!ocrText) {
        throw new Error(
          "No text was detected. Please try a clearer prescription image."
        );
      }

      await worker.terminate();
      worker = null;

      // Step 2: Send OCR text to the Spring Boot backend.
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ocrText,
        }),
      });

      const responseText = await response.text();

      let responseData = {};

      try {
        responseData = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Your session may have expired. Please sign in again."
          );
        }

        throw new Error(
          responseData.error ||
            `Prescription analysis failed (status ${response.status}).`
        );
      }

      if (!responseData.result) {
        throw new Error(
          "The analysis service did not return medicine details."
        );
      }

      // Step 3: Parse medicine details returned by Gemini.
      const analyzedMedicines = parseGeminiResponse(
        responseData.result
      );

      if (analyzedMedicines.length === 0) {
        throw new Error(
          "No medicine entries were identified. Please try another image."
        );
      }

      setMedicines(analyzedMedicines);

      setSuccess(
        "Analysis complete. Please check each medicine against the original prescription."
      );
    } catch (err) {
      console.error("Prescription analysis error:", err);

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Check that Spring Boot is running on port 8080."
        );
      } else {
        setError(
          err.message ||
            "Unable to analyze this prescription. Please try again."
        );
      }
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.error(
            "Unable to stop OCR worker:",
            terminateError
          );
        }
      }

      setLoading(false);
    }
  };

  /* =======================================================
     EDIT MEDICINE DETAILS
  ======================================================= */

  const updateMedicine = (id, field, value) => {
    setMedicines((previous) =>
      previous.map((medicine) => {
        if (medicine.id !== id) {
          return medicine;
        }

        const updated = {
          ...medicine,
          [field]: value,
        };

        const missingFields = [];

        if (!updated.medicineName.trim()) {
          missingFields.push("medicine name");
        }

        if (!updated.strength.trim()) {
          missingFields.push("strength");
        }

        if (!updated.dosage.trim()) {
          missingFields.push("dosage");
        }

        if (!updated.frequency.trim()) {
          missingFields.push("frequency");
        }

        if (!updated.duration.trim()) {
          missingFields.push("duration");
        }

        return {
          ...updated,
          missingFields,
          reviewRequired: missingFields.length > 0,
        };
      })
    );

    setError("");
    setSuccess("");
  };

  /* =======================================================
     SAVE PRESCRIPTION
  ======================================================= */

  const handleSavePrescription = async () => {
    // Immediately block repeated clicks.
    if (saveLock.current) {
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!file || medicines.length === 0) {
        throw new Error(
          "Analyze a prescription before saving it."
        );
      }

      // Validate required medicine details.
      const incompleteIndex = medicines.findIndex(
        (medicine) =>
          !medicine.medicineName.trim() ||
          !medicine.strength.trim() ||
          !medicine.dosage.trim() ||
          !medicine.frequency.trim() ||
          !medicine.duration.trim()
      );

      if (incompleteIndex !== -1) {
        const medicine = medicines[incompleteIndex];
        const missingFields = [];

        if (!medicine.medicineName.trim()) {
          missingFields.push("medicine name");
        }

        if (!medicine.strength.trim()) {
          missingFields.push("strength");
        }

        if (!medicine.dosage.trim()) {
          missingFields.push("dosage");
        }

        if (!medicine.frequency.trim()) {
          missingFields.push("frequency");
        }

        if (!medicine.duration.trim()) {
          missingFields.push("duration");
        }

        throw new Error(
          `Complete the required fields for Medicine ${incompleteIndex + 1}: ${missingFields.join(", ")}.`
        );
      }

      if (!hasConfirmedReview) {
        throw new Error(
          "Please confirm that you checked the medicine details against the original prescription."
        );
      }

      const record = {
        id:
          currentPrescriptionId.current ||
          `prescription-${Date.now()}`,
          userEmail: localStorage.getItem("email"),
        createdAt: new Date().toISOString(),

        imageName: file.name,
        imageType: file.type,
        imageBlob: file,

        medicines: medicines.map(
          ({ missingFields, reviewRequired, ...medicine }) =>
            medicine
        ),

        remindersActivated: false,
      };

      // This function checks existing records by image fingerprint.
      // It updates an existing prescription instead of adding a duplicate.
      // Save the prescription in its existing prescription database
      const savedRecord = await savePrescriptionLocally(record);

      const email = localStorage.getItem("email");

      if (!email) {
        throw new Error("Please log in again to save your prescription.");
      }
      // Get existing medicines to avoid duplicates when saving again
      const existingMedicines = await getAllMedicines();

      for (const medicine of record.medicines) {
        const durationMatch = String(medicine.duration).match(
          /^\s*(\d+)\s*(.*)\s*$/
        );

        const medicineData = {
          medicineName: medicine.medicineName,
          strength: medicine.strength,

          // Map prescription data to medicineDB fields
          dose: medicine.dosage,
          frequency: medicine.frequency,
          foodInstruction: medicine.foodInstruction || "After food",

          // These fields are not collected in your prescription form
          purpose: "",
          timesOfDay: medicine.timesOfDay?.length
                    ? medicine.timesOfDay
                    : medicine.instructions
                      ? [medicine.instructions]
                      : [],
          startDate: "",
          duration: durationMatch
            ? durationMatch[1]
            : medicine.duration,
          durationUnit: durationMatch
            ? durationMatch[2].trim()
            : "",

          // Track the source so the same prescription medicine
          // can be updated instead of saved again
          prescriptionRecordId: savedRecord.id,
          prescriptionMedicineId: medicine.id,
          userEmail: email,
        };

        const existingMedicine = existingMedicines.find(
          (item) =>
            item.prescriptionRecordId === savedRecord.id &&
            item.prescriptionMedicineId === medicine.id
        );

        if (existingMedicine) {
          await updateMedicine({
            ...existingMedicine,
            ...medicineData,
          });
        } else {
          await saveMedicine(medicineData);
        }
      }

      currentPrescriptionId.current = savedRecord.id;

      setSuccess(
        "Prescription saved successfully. Duplicate records for this image have been checked."
      );

      navigate("/medicines");
    } catch (err) {
      console.error("Save prescription error:", err);

      setError(
        err.message ||
          "Could not save the prescription on this device."
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="container py-4">
      <button
        type="button"
        className="btn btn-outline-secondary mb-3"
        onClick={() => navigate("/prescription")}
        disabled={loading || saving}
      >
        ← Back
      </button>

      <h2 className="fw-bold mb-2">
        Add Prescription
      </h2>

      <p className="text-muted mb-4">
        Upload a prescription and we will organize the medicine details for you.
      </p>

      <div className="card border-0 shadow-sm p-4">
        <label
          htmlFor="prescription-image"
          className="form-label fw-bold"
        >
          Choose prescription image
        </label>

        <input
          id="prescription-image"
          type="file"
          className="form-control"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading || saving}
        />

        <small className="text-muted mt-2">
          Image files only. Maximum size: 10 MB.
        </small>

        {preview && (
          <div className="mt-4">
            <h5 className="fw-bold mb-3">
              Prescription Preview
            </h5>

            <img
              src={preview}
              alt="Selected prescription"
              className="img-fluid rounded border"
              style={{
                maxHeight: "400px",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={handleAnalyzePrescription}
          disabled={!file || loading || saving}
        >
          {loading
            ? "Reading and analyzing..."
            : "Analyze Prescription"}
        </button>

        {loading && (
          <div
            className="mt-3"
            role="status"
            aria-live="polite"
          >
            <p className="mb-2">
              {progress < 100
                ? `Reading prescription: ${progress}%`
                : "Organizing medicine details. Please wait..."}
            </p>

            <div
              className="progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            className="alert alert-warning mt-3"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="alert alert-success mt-3"
            role="status"
          >
            {success}
          </div>
        )}

        {medicines.length > 0 && (
          <div className="mt-4">
            <h4 className="fw-bold">
              Review Medicine Details
            </h4>

            <p className="text-muted">
              Please compare every field with the original prescription before saving.
            </p>

            <div
              className="alert alert-warning"
              role="alert"
            >
              AI can make mistakes when reading medicine names,
              strengths, doses, and durations. Verify every detail
              against the original prescription before relying on it.
            </div>

            {medicines.map((medicine, index) => (
              <div
                key={medicine.id}
                className="card border shadow-sm p-3 mb-3"
              >
                <h5 className="fw-bold">
                  Medicine {index + 1}
                </h5>

                {medicine.reviewRequired && (
                  <div
                    className="alert alert-danger py-2"
                    role="alert"
                  >
                    Please complete:{" "}
                    {medicine.missingFields.join(", ")}.
                  </div>
                )}

                {[
                  [
                    "medicineName",
                    "Medicine name",
                    "e.g. Paracetamol",
                  ],
                  [
                    "strength",
                    "Strength",
                    "e.g. 500 mg",
                  ],
                  [
                    "dosage",
                    "Dosage",
                    "e.g. 1 tablet",
                  ],
                  [
                    "frequency",
                    "Frequency",
                    "e.g. Twice daily",
                  ],
                  [
                    "instructions",
                    "Instructions",
                    "e.g. After food",
                  ],
                  [
                    "duration",
                    "Duration",
                    "e.g. 5 days",
                  ],
                ].map(([field, label, placeholder]) => (
                  <div
                    className="mb-3"
                    key={field}
                  >
                    <label
                      className="form-label"
                      htmlFor={`${medicine.id}-${field}`}
                    >
                      {label}
                    </label>

                    <input
                      id={`${medicine.id}-${field}`}
                      className="form-control"
                      value={medicine[field]}
                      placeholder={placeholder}
                      onChange={(event) =>
                        updateMedicine(
                          medicine.id,
                          field,
                          event.target.value
                        )
                      }
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            ))}

            <div className="form-check mb-3">
              <input
                id="confirm-prescription"
                className="form-check-input"
                type="checkbox"
                checked={hasConfirmedReview}
                onChange={(event) => {
                  setHasConfirmedReview(
                    event.target.checked
                  );
                  setError("");
                }}
                disabled={saving}
              />

              <label
                className="form-check-label"
                htmlFor="confirm-prescription"
              >
                I have checked the medicine details against the original prescription.
              </label>
            </div>

            <button
              type="button"
              className="btn btn-success w-100"
              onClick={handleSavePrescription}
              disabled={loading || saving}
            >
              {saving
                ? "Saving Prescription..."
                : "Save Prescription"}
            </button>

            <p className="text-muted small mt-3 mb-0">
              Prescriptions are stored locally in this browser.
              They are not synchronized across devices, and saving
              does not activate medicine reminders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadPrescription;