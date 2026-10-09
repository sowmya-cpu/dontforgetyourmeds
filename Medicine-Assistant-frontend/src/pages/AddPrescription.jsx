import React from "react";
import { useNavigate } from "react-router-dom";

import uploadPrescriptionImage from "../assets/images/prescription.png";
import addManuallyImage from "../assets/images/add-manually.png";

function AddPrescription() {

  const navigate = useNavigate();

  return (

    <div className="container py-4">


      {/* Page Title */}
      <h2 className="fw-bold mb-2">
        Add Prescription
      </h2>

      <p className="text-muted mb-4">
        Choose how you want to add your medicines.
      </p>


      {/* Options */}
      <div className="row g-3">


        {/* Upload Prescription */}
        <div className="col-12 col-md-6">

          <div
            className="card border-0 shadow-sm h-100 p-3 dashboard-card"
            onClick={() => navigate("/upload-prescription")}
            style={{ cursor: "pointer" }}
          >

            <div className="d-flex align-items-center">

              <img
                src={uploadPrescriptionImage}
                alt="Upload Prescription"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain"
                }}
                className="me-3"
              />

              <div>

                <h5 className="fw-bold mb-1">
                  Upload Prescription
                </h5>

                <p className="text-muted mb-0">
                  Upload a photo or PDF of your prescription.
                  We will extract medicines automatically.
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* Add Manually */}
        <div className="col-12 col-md-6">

          <div
            className="card border-0 shadow-sm h-100 p-3 dashboard-card"
            onClick={() => navigate("/add-manually")}
            style={{ cursor: "pointer" }}
          >

            <div className="d-flex align-items-center">

              <img
                src={addManuallyImage}
                alt="Add Manually"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain"
                }}
                className="me-3"
              />

              <div>

                <h5 className="fw-bold mb-1">
                  Add Manually
                </h5>

                <p className="text-muted mb-0">
                  Enter each medicine manually with name,
                  dosage, timing etc.
                </p>

              </div>

            </div>

          </div>

        </div>


      </div>

    </div>

  );
}

export default AddPrescription;