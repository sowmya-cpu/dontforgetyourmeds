import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Profile() {

  const [profile, setProfile] = useState({
    username: "",
    email: ""
  });

  const navigate = useNavigate();


  useEffect(() => {

    const fetchProfile = async () => {

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {

        const response = await fetch(
          "http://localhost:8080/api/auth/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {

          const data = await response.json();

          setProfile(data);

        } else {

          localStorage.removeItem("token");
          navigate("/login");

        }

      } catch (error) {

        console.error("Profile error:", error);

      }

    };

    fetchProfile();

  }, [navigate]);


  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/");

  };


  return (

    <div className="container py-4">

      {/* Page Title */}
      <h2 className="fw-bold mb-2">
        My Profile
      </h2>

      <p className="text-muted mb-4">
        View your account information.
      </p>


      {/* Account Details */}
      <div className="card border-0 shadow-sm">

        <div className="card-body">

          <h5 className="fw-bold mb-4">
            Account Details
          </h5>


          {/* Username */}
          <div className="mb-3">

            <small className="text-muted">
              Username
            </small>

            <div className="fw-semibold">
              {profile.username}
            </div>

          </div>


          {/* Email */}
          <div>

            <small className="text-muted">
              Email
            </small>

            <div className="fw-semibold">
              {profile.email}
            </div>

          </div>

        </div>

      </div>


      {/* Logout */}
      <div className="mt-4 d-lg-none">

        <button
          className="btn btn-danger"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>

      </div>

    </div>

  );

}

export default Profile;