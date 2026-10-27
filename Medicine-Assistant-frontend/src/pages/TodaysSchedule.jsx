
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getMedicinesByUser,
  getDoseHistoryForDate,
  markDoseAsTaken,
} from "../database/medicineDB";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const slots = [
  { name: "Morning", icon: "🌅" },
  { name: "Afternoon", icon: "☀️" },
  { name: "Night", icon: "🌙" },
];

function TodaysSchedule() {
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const today = getToday();

  const loadData = useCallback(async () => {
    try {
      const email = localStorage.getItem("email")?.trim().toLowerCase();

      if (!email) {
        setMedicines([]);
        setHistory([]);
        toast.error("Please log in again.");
        return;
      }

      const [userMedicines, doseHistory] = await Promise.all([
        getMedicinesByUser(email),
        getDoseHistoryForDate(today),
      ]);

      setMedicines(userMedicines);
      setHistory(doseHistory);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load today's schedule.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeMedicines = medicines.filter((medicine) => {
    if (!medicine.startDate || !medicine.duration) return false;

    const start = new Date(`${medicine.startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return false;

    const duration = Number(medicine.duration);
    if (duration <= 0) return false;

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

    return today >= getTodayFromDate(start) &&
      today <= getTodayFromDate(end);
  });

  function getTodayFromDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const doses = activeMedicines.flatMap((medicine) => {
    const times = Array.isArray(medicine.timesOfDay)
      ? medicine.timesOfDay
      : [];

    return times.map((timeOfDay) => ({
      medicine,
      timeOfDay,
    }));
  });

  const isTaken = (medicineId, timeOfDay) =>
    history.some(
      (item) =>
        item.medicineId === medicineId &&
        item.timeOfDay === timeOfDay &&
        item.status === "taken"
    );

  const takenCount = doses.filter(({ medicine, timeOfDay }) =>
    isTaken(medicine.id, timeOfDay)
  ).length;

  const remainingCount = doses.length - takenCount;
  const progress = doses.length
    ? Math.round((takenCount / doses.length) * 100)
    : 0;

  const handleMarkAsTaken = async (medicineId, timeOfDay) => {
    const key = `${medicineId}-${timeOfDay}`;
    if (saving === key) return;

    setSaving(key);

    try {
      const inserted = await markDoseAsTaken(
        medicineId,
        today,
        timeOfDay
      );

      await loadData();

      if (inserted) {
        toast.success("Dose marked as taken!");
      } else {
        toast.info("This dose is already marked as taken.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to save dose confirmation.");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" />
        <p className="text-secondary mt-3">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 px-md-4 py-4 pb-5">
      {/* <div className="mb-4">
        <h2 className="fw-bold">Today's Schedule</h2>
        <p className="text-secondary">
          Your daily medicine reminders
        </p>
        <small className="text-secondary">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </small>
      </div> */}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3 p-md-4">
          <h5 className="fw-bold mb-3">Your daily progress</h5>

          <div className="row g-2 text-center mb-3">
            <div className="col-4">
              <div className="bg-light rounded-3 p-3">
                <h3 className="fw-bold">{doses.length}</h3>
                <small>Scheduled</small>
              </div>
            </div>
            <div className="col-4">
              <div className="bg-light rounded-3 p-3">
                <h3 className="fw-bold text-success">{takenCount}</h3>
                <small>Taken</small>
              </div>
            </div>
            <div className="col-4">
              <div className="bg-light rounded-3 p-3">
                <h3 className="fw-bold text-warning">{remainingCount}</h3>
                <small>Remaining</small>
              </div>
            </div>
          </div>

          <div className="progress" style={{ height: "8px" }}>
            <div
              className="progress-bar bg-success"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small className="text-secondary d-block mt-2">
            {progress}% confirmed as taken
          </small>
        </div>
      </div>

      {doses.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="fs-1">💊</div>
            <h5 className="fw-bold mt-3">
              No medicines scheduled today
            </h5>
            <p className="text-secondary mb-0">
              Add a medicine with a valid start date, duration,
              and time-of-day selection.
            </p>
          </div>
        </div>
      ) : (
        slots.map((slot) => {
          const slotDoses = doses.filter(
            (dose) => dose.timeOfDay === slot.name
          );

          if (slotDoses.length === 0) return null;

          return (
            <section className="mb-4" key={slot.name}>
              <h5 className="fw-bold mb-3">
                {slot.icon} {slot.name}
                <span className="badge bg-light text-secondary ms-2">
                  {slotDoses.length}
                </span>
              </h5>

              <div className="row g-3">
                {slotDoses.map(({ medicine, timeOfDay }) => {
                  const taken = isTaken(medicine.id, timeOfDay);
                  const key = `${medicine.id}-${timeOfDay}`;

                  return (
                    <div className="col-12 col-lg-6" key={key}>
                      <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                          <div className="d-flex gap-3 align-items-start">
                            {medicine.medicineImage && (
                              <img
                                src={URL.createObjectURL(
                                  medicine.medicineImage
                                )}
                                alt={medicine.medicineName}
                                className="rounded-3"
                                style={{
                                  width: "85px",
                                  height: "100px",
                                  objectFit: "cover",
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <div className="flex-grow-1">
                              <h5 className="fw-bold">
                                {medicine.medicineName}
                              </h5>
                              {/* <p className="text-secondary small mb-2">
                                {medicine.strength} · {medicine.medicineType}
                              </p> */}
                              <p className="mb-1">
                                {medicine.purpose}
                              </p>
                              <p className="mb-1">
                                <strong>Dose:</strong> {medicine.dose} unit(s)
                              </p>
                              <p className="mb-2">
                                <strong>Food:</strong> {medicine.foodInstruction}
                              </p>

                              {taken ? (
                                <span className="badge bg-success">
                                  ✓ Taken
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={saving === key}
                                  onClick={() =>
                                    handleMarkAsTaken(
                                      medicine.id,
                                      timeOfDay
                                    )
                                  }
                                >
                                  {saving === key
                                    ? "Saving..."
                                    : "Mark as Taken"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

export default TodaysSchedule;
