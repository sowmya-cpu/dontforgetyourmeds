
import React, { useEffect, useState } from "react";
import { getAllMedicines, deleteMedicine } from "../database/medicineDB";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { syncReminderSchedules } from "../utils/reminderSync";

function MyMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const savedMedicines = await getAllMedicines();
        setMedicines(savedMedicines);
      } catch (error) {
        console.error("Error loading medicines:", error);
        toast.error("Unable to load medicines.");
      } finally {
        setLoading(false);
      }
    };

    loadMedicines();
  }, []);

  
const handleDelete = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this medicine?"
  );

  if (!confirmed) return;

  try {
    // Delete medicine from IndexedDB
    await deleteMedicine(id);

    // Update the medicine list on screen
    setMedicines((previousMedicines) =>
      previousMedicines.filter((medicine) => medicine.id !== id)
    );

    // Sync remaining medicine reminder slots with backend
    if (localStorage.getItem("remindersEnabled") === "true") {
      await syncReminderSchedules();
    }

    toast.success("Medicine deleted successfully!");
  } catch (error) {
    console.error("Error deleting medicine:", error);
    toast.error("Unable to delete medicine.");
  }
};


  return (
    <div className="container-fluid px-3 px-md-4 py-4 pb-5">
      {/* Page Header */}
      {/* <div className="mb-4">
        <h2 className="fw-bold mb-2">My Medicines</h2>
        <p className="text-secondary mb-0">
          View and manage your saved medicines
        </p>
      </div> */}

      {/* Total Medicines */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3 d-flex align-items-center gap-3">
          <div
            className="rounded-3 p-3"
            style={{ backgroundColor: "#e8f0ff" }}
          >
            <span
              className="fs-3"
              role="img"
              aria-label="Medicine"
            >
              💊
            </span>
          </div>

          <div>
            <p className="text-secondary mb-1">
              Total Medicines
            </p>
            <h3 className="fw-bold mb-0">
              {medicines.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-secondary mt-2">
            Loading your medicines...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && medicines.length === 0 && (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="fs-1 mb-3">💊</div>
            <h5 className="fw-bold">No medicines added yet</h5>
            <p className="text-secondary mb-0">
              Your saved medicines will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Medicine Cards */}
      {!loading && medicines.length > 0 && (
        <div className="row g-3">
          {medicines.map((medicine) => (
            
            <div className="col-12 col-md-6" key={medicine.id}>
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="fw-bold mb-0">
                      {medicine.medicineName}
                    </h5>

                    <div className="dropdown position-relative">
                      <button
                        type="button"
                        className="btn border-0 p-1 rounded-circle"
                        aria-label="Medicine options"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === medicine.id ? null : medicine.id
                          )
                        }
                      >
                        <i className="bi bi-three-dots-vertical fs-5"></i>
                      </button>

                      {openMenuId === medicine.id && (
                        <div
                          className="dropdown-menu show end-0"
                          style={{
                            position: "absolute",
                            left: "auto",
                            top: "100%",
                            minWidth: "130px",
                            zIndex: 10,
                          }}
                        >
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate("/add-manually", {
                                state: { medicineId: medicine.id },
                              });
                            }}
                          >
                            <i className="bi bi-pencil me-2"></i>
                            Edit
                          </button>

                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDelete(medicine.id);
                            }}
                          >
                            <i className="bi bi-trash me-2"></i>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex gap-3 align-items-start">
                    {medicine.medicineImage && (
                      <img
                        src={URL.createObjectURL(medicine.medicineImage)}
                        alt={medicine.medicineName}
                        className="rounded-3"
                        style={{
                          width: "90px",
                          height: "110px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <div className="flex-grow-1">
                      <p className=" mb-1">
                        {/* {medicine.strength} · {medicine.medicineType} */}
                        {medicine.purpose}
                      </p>

                      <p className="mb-1">
                        <strong>Dose:</strong> {medicine.dose} unit(s)
                      </p>

                      <p className="mb-1">
                        <strong>Frequency:</strong> {medicine.frequency} time(s) a day
                      </p>

                      <p className="mb-1">
                        <strong>Time:</strong>{" "}
                        {Array.isArray(medicine.timesOfDay)
                          ? medicine.timesOfDay
                              .map((time) => {
                                const value = time?.toLowerCase().trim();

                                if (value.includes("morning") || value.includes("breakfast"))
                                  return "Morning";

                                if (value.includes("afternoon") || value.includes("lunch"))
                                  return "Afternoon";

                                if (value.includes("night") || value.includes("dinner"))
                                  return "Night";

                                return time;
                              })
                              .join(", ")
                          : medicine.timesOfDay}
                      </p>

                      <p className="mb-0">
                        <strong>Food:</strong> {medicine.foodInstruction}
                      </p>
                    </div>
                  </div>

                  <hr />

                  <p className="mb-1">
                    <strong>Start date:</strong>{" "}
                    {medicine.startDate || "Not specified"}
                  </p>

                  <p className="mb-0">
                    <strong>Duration:</strong>{" "}
                    {medicine.duration} {medicine.durationUnit}
                  </p>
                </div>
              </div>
            </div>

          ))}
        </div>
      )}
    </div>
  );
}

export default MyMedicines;
