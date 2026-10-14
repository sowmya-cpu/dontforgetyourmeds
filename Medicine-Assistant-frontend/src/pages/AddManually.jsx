import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import cameraImage from "../assets/images/take-photo.png";
import galleryImage from "../assets/images/choose-gallery.png";

function AddManually() {

  const navigate = useNavigate();

  const [medicineName, setMedicineName] = useState("");
  const [strength, setStrength] = useState("");
  const [medicineType, setMedicineType] = useState("Tablet");
  const [dose, setDose] = useState("1");
  const [frequency, setFrequency] = useState("1");
  const [timesOfDay, setTimesOfDay] = useState(["Morning"]);
  const [foodInstruction, setFoodInstruction] = useState("After food");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [medicineImage, setMedicineImage] = useState(null);


  // Change frequency
  const handleFrequencyChange = (value) => {

    setFrequency(value);

    const defaultTimes = [
      "Morning",
      "Afternoon",
      "Night"
    ];

    const newTimes = defaultTimes.slice(0, Number(value));

    setTimesOfDay(newTimes);
  };


  // Change time of day
  const handleTimeChange = (index, value) => {

    const updatedTimes = [...timesOfDay];

    updatedTimes[index] = value;

    setTimesOfDay(updatedTimes);
  };


  // Handle medicine image
  const handleImageChange = (event) => {

    const file = event.target.files[0];

    if (file) {
      setMedicineImage(file);
    }

  };


  // Submit
  const handleSubmit = (event) => {

    event.preventDefault();

    console.log({
      medicineName,
      strength,
      medicineType,
      dose,
      frequency,
      timesOfDay,
      foodInstruction,
      startDate,
      duration,
      durationUnit,
      medicineImage
    });

  };


  return (

    <div className="container py-4">

      {/* Back */}
      <button
        type="button"
        className="btn btn-link text-dark text-decoration-none p-0 mb-3"
        onClick={() => navigate("/prescription")}
      >
        ← Back
      </button>


      {/* Title */}
      <h2 className="fw-bold mb-2">
        Add Medicine
      </h2>

      <p className="text-muted mb-4">
        Enter your medicine details manually.
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
              onChange={(e) => setMedicineName(e.target.value)}
              required
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
              onChange={(e) => setStrength(e.target.value)}
              required
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
              onChange={(e) => setMedicineType(e.target.value)}
            >

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
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                required
              />

              <span className="input-group-text">
                {medicineType === "Syrup" ? "ml" : medicineType}
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

              <option value="1">
                Once a day
              </option>

              <option value="2">
                Twice a day
              </option>

              <option value="3">
                Three times a day
              </option>

            </select>

          </div>


          {/* When */}
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

                <option value="Morning">
                  Morning
                </option>

                <option value="Afternoon">
                  Afternoon
                </option>

                <option value="Night">
                  Night
                </option>

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

              <option value="Before food">
                Before food
              </option>

              <option value="After food">
                After food
              </option>

              <option value="Empty stomach">
                Empty stomach
              </option>

            </select>

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
              onChange={(e) => setStartDate(e.target.value)}
              required
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
                placeholder="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />

              <select
                className="form-select"
                value={durationUnit}
                onChange={(e) =>
                  setDurationUnit(e.target.value)
                }
              >

                <option value="Days">
                  Days
                </option>

                <option value="Weeks">
                  Weeks
                </option>

                <option value="Months">
                  Months
                </option>

              </select>

            </div>

          </div>


          {/* Medicine Image */}
          <div className="col-12">

            <label className="form-label fw-semibold">
              Medicine Image
            </label>


            {/* Desktop */}
            <div className="d-none d-lg-block">

              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleImageChange}
                required
              />

              <small className="text-muted">
                Upload a clear image of the medicine.
              </small>

            </div>


            {/* Phone / Tablet */}
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
                      style={{
                        backgroundColor: "#eef7ff"
                      }}
                    >

                      <img
                        src={cameraImage}
                        alt="Take Photo"
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "contain"
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
                      style={{
                        backgroundColor: "#eef7ff"
                      }}
                    >

                      <img
                        src={galleryImage}
                        alt="Choose from Gallery"
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "contain"
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
                Upload a clear image of the medicine.
              </small>

            </div>


            {/* Selected image */}
            {medicineImage && (

              <div className="alert alert-success mt-3 mb-0">

                Selected:
                {" "}

                <strong>
                  {medicineImage.name}
                </strong>

              </div>

            )}

          </div>


          {/* Save Button */}
          <div className="col-12 mt-4">

            <button
              type="submit"
              className="btn btn-primary w-100"
            >
              Save Medicine
            </button>

          </div>


        </div>

      </form>

    </div>

  );
}

export default AddManually;