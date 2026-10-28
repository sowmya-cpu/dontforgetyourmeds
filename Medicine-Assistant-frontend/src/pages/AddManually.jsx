import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getMedicineById,
  getMedicinesByUser,
  saveMedicine,
  updateMedicine,
} from "../database/medicineDB";
import { toast } from "react-toastify";
import { syncReminderSchedules } from "../utils/reminderSync";

import cameraImage from "../assets/images/take-photo.png";
import galleryImage from "../assets/images/choose-gallery.png";

function AddManually() {
  const [medicineName, setMedicineName] = useState("");
  const [strength, setStrength] = useState("");
  const [medicineType, setMedicineType] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [timesOfDay, setTimesOfDay] = useState([]);
  const [foodInstruction, setFoodInstruction] = useState("");
  const [purpose, setPurpose] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("");
  const [medicineImage, setMedicineImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const medicineId = location.state?.medicineId;
  const isEditing = medicineId !== undefined;

  // Load existing medicine when editing
  useEffect(() => {
    if (!isEditing) return;

      const loadMedicine = async () => {
        try {
          const medicine = await getMedicineById(medicineId);
          const email = localStorage.getItem("email")?.trim().toLowerCase();

          if (!email || medicine?.userEmail?.trim().toLowerCase() !== email) {
            toast.error("You cannot edit this medicine.");
            navigate("/medicines");
            return;
          }

        if (!medicine) {
          toast.error("Medicine not found.");
          navigate("/medicines");
          return;
        }

        setMedicineName(medicine.medicineName ?? "");
        setStrength(medicine.strength ?? "");
        setMedicineType(medicine.medicineType ?? "");
        setDose(
          medicine.dose == null ? "" : String(medicine.dose)
        );
        setFrequency(
          medicine.frequency == null
            ? ""
            : String(medicine.frequency)
        );
        setTimesOfDay(medicine.timesOfDay ?? []);
        setFoodInstruction(medicine.foodInstruction ?? "");

        const predefinedPurposes = [
          "Fever",
          "Cold",
          "Cough",
          "Headache",
          "Pain",
          "Allergy",
        ];

        if (predefinedPurposes.includes(medicine.purpose)) {
          setPurpose(medicine.purpose);
          setCustomPurpose("");
        } else if (medicine.purpose) {
          setPurpose("Other");
          setCustomPurpose(medicine.purpose);
        } else {
          setPurpose("");
          setCustomPurpose("");
        }

        setStartDate(medicine.startDate ?? "");
        setDuration(
          medicine.duration == null
            ? ""
            : String(medicine.duration)
        );
        setDurationUnit(medicine.durationUnit ?? "");
        setMedicineImage(medicine.medicineImage ?? null);
      } catch (error) {
        console.error("Error loading medicine:", error);
        toast.error("Unable to load medicine.");
      }
    };

    loadMedicine();
  }, [isEditing, medicineId, navigate]);

  // Update frequency and default medicine times
  const handleFrequencyChange = (value) => {
    setFrequency(value);

    const defaultTimes = ["Morning", "Afternoon", "Night"];

    setTimesOfDay(
      value ? defaultTimes.slice(0, Number(value)) : []
    );
  };

  // Change a selected medicine time
  const handleTimeChange = (index, value) => {
    const updatedTimes = [...timesOfDay];
    updatedTimes[index] = value;
    setTimesOfDay(updatedTimes);
  };

  // Handle medicine image selection
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      setMedicineImage(file);
    }
  };

  // Save or update medicine
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prevent repeated submissions
    if (isSaving) return;
    if (!medicineImage) {
      toast.error("Please upload a medicine image");
      return;
    }
    const email = localStorage.getItem("email")?.trim().toLowerCase();

    if (!email) {
      toast.error("Please log in again.");
      return;
    }
    setIsSaving(true);
    try {
      const medicineData = {
        medicineName: medicineName.trim(),
        strength: strength.trim(),
        medicineType: medicineType || "",
        dose: dose.trim() === "" ? null : Number(dose),
        frequency:
          frequency.trim() === "" ? null : Number(frequency),
        timesOfDay: frequency ? timesOfDay : [],
        foodInstruction: foodInstruction || "",
        purpose:
          purpose === "Other"
            ? customPurpose.trim()
            : purpose,
        startDate: startDate || "",
        duration:
          duration.trim() === "" ? null : Number(duration),
        durationUnit: durationUnit || "",
        medicineImage: medicineImage || null,
        userEmail: email,
      };

      // Prevent duplicate medicines when adding a new record
      if (!isEditing && medicineData.medicineName) {
        const existingMedicines = await getMedicinesByUser(email);

        const normalizedName =
          medicineData.medicineName.toLowerCase();

        const normalizedStrength =
          medicineData.strength.toLowerCase();

        const duplicate = existingMedicines.some((medicine) => {
          const existingName = (
            medicine.medicineName || ""
          )
            .trim()
            .toLowerCase();

          const existingStrength = (
            medicine.strength || ""
          )
            .trim()
            .toLowerCase();

          return (
            existingName === normalizedName &&
            existingStrength === normalizedStrength
          );
        });

        if (duplicate) {
          toast.warning(
            "This medicine with the same strength is already saved."
          );
          return;
        }
      }

      if (isEditing) {
        // Update the existing medicine instead of creating another
        await updateMedicine({
          ...medicineData,
          id: Number(medicineId),
        });

        await syncReminderSchedules();

        toast.success("Medicine updated successfully!");

        navigate("/medicines");
      } else {
        // Save a new medicine
        await saveMedicine(medicineData);

        await syncReminderSchedules();

        toast.success("Medicine saved successfully!");

        // Reset form after successful save
        setMedicineName("");
        setStrength("");
        setMedicineType("");
        setDose("");
        setFrequency("");
        setTimesOfDay([]);
        setFoodInstruction("");
        setPurpose("");
        setCustomPurpose("");
        setStartDate("");
        setDuration("");
        setDurationUnit("");
        setMedicineImage(null);

        event.target.reset();
      }
    } catch (error) {
      console.error("Error saving medicine:", error);

      toast.error(
        "Unable to save medicine. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Back button */}
      <button
        type="button"
        className="btn btn-link text-dark text-decoration-none p-0 mb-3"
        onClick={() => navigate("/prescription")}
      >
        ← Back
      </button>

      {/* Page title */}
      <h2 className="fw-bold mb-2">Add Medicine</h2>

      <p className="text-muted mb-4">
        Enter your medicine details manually. All fields are optional.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Medicine Name */}
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">
              Medicine Name
            </label>

            <input
              type="text"
              className="form-control"
              placeholder="Example: Paracetamol"
              value={medicineName}
              onChange={(e) =>
                setMedicineName(e.target.value)
              }
            />
          </div>

          {/* Strength */}
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">
              Strength
            </label>

            <input
              type="text"
              className="form-control"
              placeholder="Example: 500 mg"
              value={strength}
              onChange={(e) =>
                setStrength(e.target.value)
              }
            />
          </div>

          {/* Medicine Type */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Medicine Type
            </label>

            <select
              className="form-select"
              value={medicineType}
              onChange={(e) =>
                setMedicineType(e.target.value)
              }
            >
              <option value="">Select type (optional)</option>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Drops">Drops</option>
              <option value="Cream">Cream</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Dose */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Dose
            </label>

            <div className="input-group">
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Optional"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />

              <span className="input-group-text">
                {medicineType === "Syrup"
                  ? "ml"
                  : medicineType || "Unit"}
              </span>
            </div>
          </div>

          {/* Frequency */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Frequency
            </label>

            <select
              className="form-select"
              value={frequency}
              onChange={(e) =>
                handleFrequencyChange(e.target.value)
              }
            >
              <option value="">Not specified</option>
              <option value="1">Once a day</option>
              <option value="2">Twice a day</option>
              <option value="3">Three times a day</option>
            </select>
          </div>

          {/* Time of Day */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              When?
            </label>

            {timesOfDay.map((time, index) => (
              <select
                key={index}
                className="form-select mb-2"
                value={time}
                onChange={(e) =>
                  handleTimeChange(index, e.target.value)
                }
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
              </select>
            ))}
          </div>

          {/* Food Instruction */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Food Instruction
            </label>

            <select
              className="form-select"
              value={foodInstruction}
              onChange={(e) =>
                setFoodInstruction(e.target.value)
              }
            >
              <option value="">Not specified</option>
              <option value="Before food">Before food</option>
              <option value="After food">After food</option>
              <option value="Empty stomach">
                Empty stomach
              </option>
            </select>
          </div>

          {/* Purpose */}
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">
              Purpose of Medicine
            </label>

            <select
              className="form-select"
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value)
              }
            >
              <option value="">Select purpose (optional)</option>
              <option value="Fever">Fever</option>
              <option value="Cold">Cold</option>
              <option value="Cough">Cough</option>
              <option value="Headache">Headache</option>
              <option value="Pain">Pain</option>
              <option value="Allergy">Allergy</option>
              <option value="Other">Other</option>
            </select>

            {purpose === "Other" && (
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Enter purpose (optional)"
                value={customPurpose}
                onChange={(e) =>
                  setCustomPurpose(e.target.value)
                }
              />
            )}
          </div>

          {/* Start Date */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Start Date
            </label>

            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
            />
          </div>

          {/* Duration */}
          <div className="col-6">
            <label className="form-label fw-semibold">
              Duration
            </label>

            <div className="input-group">
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Optional"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
              />

              <select
                className="form-select"
                value={durationUnit}
                onChange={(e) =>
                  setDurationUnit(e.target.value)
                }
              >
                <option value="">Not specified</option>
                <option value="Days">Days</option>
                <option value="Weeks">Weeks</option>
                <option value="Months">Months</option>
              </select>
            </div>
          </div>

          {/* Medicine Image */}
          <div className="col-12">
            <label className="form-label fw-semibold">
              Medicine Image
            </label>

            {/* Desktop upload */}
            <div className="d-none d-lg-block">
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleImageChange}
              />

              <small className="text-muted">
                Upload a clear image of the medicine (optional).
              </small>
            </div>

            {/* Mobile camera and gallery */}
            <div className="d-lg-none">
              <div className="row g-2">
                {/* Take Photo */}
                <div className="col-6">
                  <label
                    className="w-100 text-center"
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      hidden
                    />

                    <div
                      className="border rounded-3 p-2 h-100"
                      style={{ backgroundColor: "#eef7ff" }}
                    >
                      <img
                        src={cameraImage}
                        alt="Take Photo"
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "contain",
                        }}
                      />

                      <div className="fw-semibold">
                        Take Photo
                      </div>
                    </div>
                  </label>
                </div>

                {/* Choose from Gallery */}
                <div className="col-6">
                  <label
                    className="w-100 text-center"
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      hidden
                    />

                    <div
                      className="border rounded-3 p-2 h-100"
                      style={{ backgroundColor: "#eef7ff" }}
                    >
                      <img
                        src={galleryImage}
                        alt="Choose from Gallery"
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "contain",
                        }}
                      />

                      <div className="fw-semibold">
                        Choose from Gallery
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <small className="text-muted d-block mt-2">
                Upload a clear image of the medicine (optional).
              </small>
            </div>

            {/* Selected image */}
            {medicineImage && (
              <div className="alert alert-success mt-3 mb-0">
                Selected:{" "}
                <strong>
                  {medicineImage.name ||
                    "Existing medicine photo"}
                </strong>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="col-12 mt-4">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Medicine"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddManually;