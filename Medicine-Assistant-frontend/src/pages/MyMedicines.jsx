import React, { useCallback, useEffect, useState } from "react";

const DATABASE_NAME = "MedicationAssistantPrescriptionDB";
const STORE_NAME = "prescriptions";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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

async function updatePrescription(updatedPrescription) {
  const database = await openPrescriptionDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(STORE_NAME).put(updatedPrescription);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error("Could not save the medicine image.")
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ||
            new Error("Saving the medicine image was cancelled.")
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
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [uploadingMedicineId, setUploadingMedicineId] = useState(null);

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

  const handleMedicineImageUpload = async (
    prescription,
    medicine,
    event
  ) => {
    const file = event.target.files?.[0];

    // Allow the same image to be selected again later.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid medicine image.");
      setSuccess("");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Please select an image smaller than 10 MB.");
      setSuccess("");
      return;
    }

    const medicineId =
      medicine.id || medicine.medicineName;

    setUploadingMedicineId(medicineId);
    setError("");
    setSuccess("");

    try {
      const updatedMedicines = prescription.medicines.map(
        (item) => {
          const itemId = item.id || item.medicineName;

          if (itemId !== medicineId) {
            return item;
          }

          return {
            ...item,
            medicineImageBlob: file,
            medicineImageName: file.name,
            medicineImageType: file.type,
          };
        }
      );

      const updatedPrescription = {
        ...prescription,
        medicines: updatedMedicines,
      };

      await updatePrescription(updatedPrescription);

      setPrescriptions((previous) =>
        previous.map((item) =>
          item.id === prescription.id
            ? updatedPrescription
            : item
        )
      );

      setSuccess(
        `Image saved for ${medicine.medicineName || "the medicine"}.`
      );
    } catch (err) {
      console.error("Saving medicine image failed:", err);

      setError(
        err.message || "Could not save the medicine image."
      );
    } finally {
      setUploadingMedicineId(null);
    }
  };

  const handleDelete = async (prescription) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this prescription and its saved medicine details?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(prescription.id);
    setError("");
    setSuccess("");

    try {
      await deletePrescription(prescription.id);

      setPrescriptions((previous) =>
        previous.filter((item) => item.id !== prescription.id)
      );

      setSuccess("Prescription deleted successfully.");
    } catch (err) {
      console.error("Deleting prescription failed:", err);

      setError(
        err.message || "Could not delete this prescription."
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
        View your saved prescriptions, medicine details, and
        individual medicine photos. Your information is stored
        locally on this device.
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
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

      {!loading && !error && prescriptions.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="display-5 mb-3" aria-hidden="true">
              💊
            </div>

            <h4 className="fw-bold">
              No saved medicines yet
            </h4>

            <p className="text-muted mb-0">
              Upload a prescription, analyze it, review the
              medicine details, and select Save Prescription.
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
                    {prescription.imageName ||
                      "Prescription image"}
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
                Medicines ({prescription.medicines?.length || 0})
              </h6>

              {prescription.medicines?.length > 0 ? (
                prescription.medicines.map((medicine, index) => {
                  const medicineId =
                    medicine.id || medicine.medicineName;

                  return (
                    <div
                      key={`${prescription.id}-${medicineId}-${index}`}
                      className="border rounded-3 p-3 mb-3"
                    >
                      <h6 className="fw-bold mb-3">
                        {index + 1}.{" "}
                        {medicine.medicineName ||
                          "Unnamed medicine"}
                      </h6>

                      <MedicineImage
                        imageBlob={medicine.medicineImageBlob}
                        imageName={medicine.medicineImageName}
                      />

                      <div className="mb-3">
                        <label
                          className="form-label fw-semibold"
                          htmlFor={`medicine-image-${prescription.id}-${index}`}
                        >
                          Upload medicine photo
                        </label>

                        <input
                          id={`medicine-image-${prescription.id}-${index}`}
                          type="file"
                          className="form-control"
                          accept="image/*"
                          capture="environment"
                          disabled={
                            uploadingMedicineId === medicineId
                          }
                          onChange={(event) =>
                            handleMedicineImageUpload(
                              prescription,
                              medicine,
                              event
                            )
                          }
                        />

                        <small className="text-muted d-block mt-1">
                          Choose a clear photo of the actual medicine
                          or its packaging. Maximum size: 10 MB.
                        </small>

                        {uploadingMedicineId === medicineId && (
                          <small
                            className="text-primary d-block mt-2"
                            role="status"
                          >
                            Saving medicine photo...
                          </small>
                        )}
                      </div>

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
                  );
                })
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

function MedicineImage({ imageBlob, imageName }) {
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
    return (
      <p className="text-muted small">
        No individual medicine photo uploaded yet.
      </p>
    );
  }

  return (
    <div className="mb-3">
      <img
        src={imageUrl}
        alt={imageName || "Saved medicine photo"}
        className="img-fluid rounded border"
        style={{
          maxHeight: "220px",
          objectFit: "contain",
        }}
      />

      <p className="text-muted small mt-1 mb-0">
        {imageName || "Saved medicine photo"}
      </p>
    </div>
  );
}

export default MyMedicines;