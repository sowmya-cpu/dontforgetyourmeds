import React, { useCallback, useEffect, useState } from "react";

const DATABASE_NAME = "MedicationAssistantPrescriptionDB";
const STORE_NAME = "prescriptions";

function openPrescriptionDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error("Could not open local medicine storage.")
      );
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };
  });
}

async function getSavedPrescriptions() {
  const database = await openPrescriptionDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error("Could not retrieve saved medicines.")
        );
      };
    });
  } finally {
    database.close();
  }
}

async function deletePrescription(prescriptionId) {
  const database = await openPrescriptionDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(STORE_NAME).delete(prescriptionId);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error("Could not delete the prescription.")
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ||
            new Error("Deleting the prescription was cancelled.")
        );
      };
    });
  } finally {
    database.close();
  }
}

function MyMedicines() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const savedPrescriptions = await getSavedPrescriptions();

      savedPrescriptions.sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );

      setPrescriptions(savedPrescriptions);
    } catch (err) {
      console.error("Loading medicines failed:", err);

      setError(
        err.message ||
          "Unable to load medicines stored on this device."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleDelete = async (prescription) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this prescription and its saved medicine details?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(prescription.id);
    setError("");

    try {
      await deletePrescription(prescription.id);

      setPrescriptions((previous) =>
        previous.filter((item) => item.id !== prescription.id)
      );
    } catch (err) {
      console.error("Deleting prescription failed:", err);

      setError(
        err.message ||
          "Could not delete this prescription."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <h2 className="fw-bold mb-0">My Medicines</h2>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadPrescriptions}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <p className="text-muted mb-4">
        View your saved prescriptions and medicine details in one place.
        Your information is stored locally on this device.
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-5" role="status">
          <div
            className="spinner-border text-primary mb-3"
            aria-hidden="true"
          />

          <p className="text-muted mb-0">
            Loading your medicines...
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        prescriptions.length === 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="display-5 mb-3" aria-hidden="true">
                💊
              </div>

              <h4 className="fw-bold">
                No saved medicines yet
              </h4>

              <p className="text-muted mb-0">
                Upload a prescription, analyze it, review the medicine
                details, and select Save Prescription.
              </p>
            </div>
          </div>
        )}

      {!loading &&
        prescriptions.map((prescription) => (
          <div
            key={prescription.id}
            className="card border-0 shadow-sm mb-4"
          >
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">
                    Saved Prescription
                  </h5>

                  <p className="text-muted small mb-1">
                    {prescription.imageName || "Prescription image"}
                  </p>

                  <p className="text-muted small mb-0">
                    Saved on:{" "}
                    {prescription.createdAt
                      ? new Date(
                          prescription.createdAt
                        ).toLocaleString()
                      : "Date unavailable"}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDelete(prescription)}
                  disabled={deletingId === prescription.id}
                >
                  {deletingId === prescription.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>

              {prescription.imageBlob && (
                <details className="mb-3">
                  <summary className="text-primary">
                    View original prescription
                  </summary>

                  <PrescriptionImage
                    imageBlob={prescription.imageBlob}
                    imageName={prescription.imageName}
                  />
                </details>
              )}

              <hr />

              <h6 className="fw-bold mb-3">
                Medicines (
                {prescription.medicines?.length || 0})
              </h6>

              {prescription.medicines?.length > 0 ? (
                prescription.medicines.map((medicine, index) => (
                  <div
                    key={
                      medicine.id ||
                      `${prescription.id}-medicine-${index}`
                    }
                    className="border rounded-3 p-3 mb-3"
                  >
                    <h6 className="fw-bold mb-3">
                      {index + 1}.{" "}
                      {medicine.medicineName ||
                        "Unnamed medicine"}
                    </h6>

                    <div className="row g-3">
                      <MedicineDetail
                        label="Strength"
                        value={medicine.strength}
                      />

                      <MedicineDetail
                        label="Dosage"
                        value={medicine.dosage}
                      />

                      <MedicineDetail
                        label="Frequency"
                        value={medicine.frequency}
                      />

                      <MedicineDetail
                        label="Duration"
                        value={medicine.duration}
                      />

                      <MedicineDetail
                        label="Instructions"
                        value={medicine.instructions}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted mb-0">
                  No medicine details were saved for this prescription.
                </p>
              )}

              <div className="alert alert-info small mb-0 mt-3">
                Saving a prescription does not activate medicine
                reminders. Follow the verified instructions from
                your healthcare professional.
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function MedicineDetail({ label, value }) {
  return (
    <div className="col-12 col-md-6">
      <div className="small text-muted">{label}</div>

      <div className="fw-semibold">
        {value?.trim() || "Not provided"}
      </div>
    </div>
  );
}

function PrescriptionImage({ imageBlob, imageName }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!imageBlob) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(imageBlob);

    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-3">
      <img
        src={imageUrl}
        alt={imageName || "Original prescription"}
        className="img-fluid rounded border"
        style={{
          maxHeight: "350px",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default MyMedicines;