import React from "react";
import { NavLink } from "react-router-dom";

function MobileBottomNav() {

  return (
    <div
      className="d-lg-none position-fixed bottom-0 start-0 w-100 bg-white border-top shadow"
      style={{ zIndex: 1000 }}
    >

      <div className="d-flex justify-content-around align-items-center py-2">

        {/* Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `text-decoration-none text-center ${
              isActive ? "text-primary" : "text-dark"
            }`
          }
        >
          <div style={{ fontSize: "20px" }}>🏠</div>
          <small>Home</small>
        </NavLink>


        {/* My Medicines */}
        <NavLink
          to="/medicines"
          className={({ isActive }) =>
            `text-decoration-none text-center ${
              isActive ? "text-primary" : "text-dark"
            }`
          }
        >
          <div style={{ fontSize: "20px" }}>💊</div>
          <small>Medicines</small>
        </NavLink>


        {/* Today's Schedule */}
        <NavLink
          to="/schedule"
          className={({ isActive }) =>
            `text-decoration-none text-center ${
              isActive ? "text-primary" : "text-dark"
            }`
          }
        >
          <div style={{ fontSize: "20px" }}>📅</div>
          <small>Schedule</small>
        </NavLink>


        {/* Add Prescription */}
        <NavLink
          to="/prescription"
          className={({ isActive }) =>
            `text-decoration-none text-center ${
              isActive ? "text-primary" : "text-dark"
            }`
          }
        >
          <div style={{ fontSize: "20px" }}>📄</div>
          <small>Prescription</small>
        </NavLink>


        {/* Ask Assistant */}
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `text-decoration-none text-center ${
              isActive ? "text-primary" : "text-dark"
            }`
          }
        >
          <div style={{ fontSize: "20px" }}>💬</div>
          <small>Assistant</small>
        </NavLink>

      </div>

    </div>
  );
}

export default MobileBottomNav;