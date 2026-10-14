import React from "react";
import { useNavigate } from "react-router-dom";

import medicineImage from "../assets/images/medicine.png";
import scheduleImage from "../assets/images/schedule.png";
import prescriptionImage from "../assets/images/prescription.png";
import assistantImage from "../assets/images/assistant.png";

function Dashboard() {

  const navigate = useNavigate();

  return (

    <div className="container py-4">

      {/* Next Medicine */}
      <div className="card border-0 shadow-sm mb-4">

        <div className="card-body d-flex justify-content-between align-items-center">

          <div>
            <small className="text-muted">
              Next Medicine
            </small>

            <h2 className="fw-bold mb-0">
              in 1 hour
            </h2>
          </div>

          <div className="text-end">
            <strong>
              Paracetamol 500 mg
            </strong>

            <br />

            <small className="text-muted">
              1 tablet • After food
            </small>
          </div>

          <span className="fs-3">
            ›
          </span>

        </div>

      </div>


      {/* Quick Action Cards */}
      <div className="row g-3">


        {/* My Medicines */}
        <div className="col-6 col-lg-3">

          <div
            className="card border-0 shadow-sm h-100 text-center p-3 dashboard-card"
            onClick={() => navigate("/medicines")}
            style={{ cursor: "pointer" }}
          >

            <img
              src={medicineImage}
              alt="My Medicines"
              className="mx-auto mb-2"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain"
              }}
            />

            <h5>
              My Medicines
            </h5>

            <small className="text-muted d-none d-lg-block">
              View and manage your medicines
            </small>

          </div>

        </div>


        {/* Today's Schedule */}
        <div className="col-6 col-lg-3">

          <div
            className="card border-0 shadow-sm h-100 text-center p-3 dashboard-card"
            onClick={() => navigate("/schedule")}
            style={{ cursor: "pointer" }}
          >

            <img
              src={scheduleImage}
              alt="Today's Schedule"
              className="mx-auto mb-2"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain"
              }}
            />

            <h5>
              Today's Schedule
            </h5>

            <small className="text-muted d-none d-lg-block">
              Check today's medicine schedule
            </small>

          </div>

        </div>


        {/* Add Prescription */}
        <div className="col-6 col-lg-3">

          <div
            className="card border-0 shadow-sm h-100 text-center p-3 dashboard-card"
            onClick={() => navigate("/prescription")}
            style={{ cursor: "pointer" }}
          >

            <img
              src={prescriptionImage}
              alt="Add Prescription"
              className="mx-auto mb-2"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain"
              }}
            />

            <h5>
              Add Prescription
            </h5>

            <small className="text-muted d-none d-lg-block">
              Upload and extract medicines
            </small>

          </div>

        </div>


        {/* Ask Assistant */}
        <div className="col-6 col-lg-3">

          <div
            className="card border-0 shadow-sm h-100 text-center p-3 dashboard-card"
            onClick={() => navigate("/assistant")}
            style={{ cursor: "pointer" }}
          >

            <img
              src={assistantImage}
              alt="Ask Assistant"
              className="mx-auto mb-2"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain"
              }}
            />

            <h5>
              Ask Assistant
            </h5>

            <small className="text-muted d-none d-lg-block">
              Get answers about your medicines
            </small>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;