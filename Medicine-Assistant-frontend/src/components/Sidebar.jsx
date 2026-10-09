import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="col-lg-2 d-none d-lg-flex flex-column bg-dark text-white p-3">

      {/* Logo / App Name */}
      <h4 className="mb-5">
        Medicine Assistant
        {/* <br /> */}
        {/* <span className="ms-4">Assistant</span> */}
      </h4>


      {/* Navigation */}
      <div className="d-flex flex-column gap-2">

        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `btn text-start ${
              isActive ? "btn-primary" : "btn-dark"
            }`
          }
        >
          🏠 &nbsp; Dashboard
        </NavLink>


        {/* My Medicines */}
        <NavLink
          to="/medicines"
          className={({ isActive }) =>
            `btn text-start ${
              isActive ? "btn-primary" : "btn-dark"
            }`
          }
        >
          💊 &nbsp; My Medicines
        </NavLink>


        {/* Today's Schedule */}
        <NavLink
          to="/schedule"
          className={({ isActive }) =>
            `btn text-start ${
              isActive ? "btn-primary" : "btn-dark"
            }`
          }
        >
          📅 &nbsp; Today's Schedule
        </NavLink>


        {/* Add Prescription */}
        <NavLink
          to="/prescription"
          className={({ isActive }) =>
            `btn text-start ${
              isActive ? "btn-primary" : "btn-dark"
            }`
          }
        >
          📄 &nbsp; Add Prescription
        </NavLink>


        {/* Ask Assistant */}
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `btn text-start ${
              isActive ? "btn-primary" : "btn-dark"
            }`
          }
        >
          💬 &nbsp; Ask Assistant
        </NavLink>


        {/* Logout */}
        <button
          className="btn btn-dark text-start"
          onClick={handleLogout}
        >
          🚪 &nbsp; Logout
        </button>

      </div>

    </div>
  );
}

export default Sidebar;