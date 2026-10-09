import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Header() {

  const [username, setUsername] = useState("");

  const navigate = useNavigate();


  useEffect(() => {

    const fetchProfile = async () => {

      const token = localStorage.getItem("token");

      if (!token) {
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

          setUsername(data.username);

        }

      } catch (error) {

        console.error("Profile error:", error);

      }

    };

    fetchProfile();

  }, []);


  // Greeting based on current time
  const currentHour = new Date().getHours();

  let greeting;

  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 17) {
    greeting = "Good Afternoon";
  } else if (currentHour < 21) {
    greeting = "Good Evening";
  } else {
    greeting = "Good Night";
  }


  // Generate username initials
  const getInitials = (name) => {

    if (!name) {
      return "";
    }

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();

  };


  const initials = getInitials(username);


  return (

    <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-white">

      {/* Greeting */}
      <div>

        <h4 className="mb-1">

          {greeting}
          {username && `, ${username}`}

        </h4>

        <small className="text-muted">

          Take your medicines on time for a healthier life.

        </small>

      </div>


      {/* Profile */}
      <div
        onClick={() => navigate("/profile")}
        className="d-flex align-items-center justify-content-center"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#e9d5ff",
          color: "#6b21a8",
          fontWeight: "600",
          cursor: "pointer"
        }}
        title="Profile"
      >

        {initials}

      </div>

    </div>

  );
}

export default Header;