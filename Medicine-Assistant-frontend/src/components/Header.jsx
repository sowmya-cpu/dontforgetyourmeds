
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingNotifications,
  dismissNotification,
} from "../database/medicineDB";

function Header() {
  const [username, setUsername] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(
          "https://dontforgetyourmeds.onrender.com/api/auth/profile",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
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

  const loadNotifications = async () => {
    try {
      const email = localStorage.getItem("email")?.trim().toLowerCase();

      if (!email) {
        setNotifications([]);
        return;
      }

      const pending = await getPendingNotifications(email);

      setNotifications(
        pending.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
    } catch (error) {
      console.error("Notification loading error:", error);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Refresh when the app returns to the foreground.
    const handleFocus = () => loadNotifications();
    const handleReminderUpdate = () => loadNotifications();
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === "MEDICINE_REMINDERS_UPDATED") {
        loadNotifications();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("medicine-reminders-updated", handleReminderUpdate);
    navigator.serviceWorker?.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(
        "medicine-reminders-updated",
        handleReminderUpdate
      );
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, []);

  const handleDismiss = async (id) => {
    try {
      await dismissNotification(id);
      await loadNotifications();
    } catch (error) {
      console.error("Notification dismissal error:", error);
    }
  };

  const currentHour = new Date().getHours();

  let greeting;
  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 17) greeting = "Good Afternoon";
  else if (currentHour < 21) greeting = "Good Evening";
  else greeting = "Good Night";

  const getInitials = (name) => {
    if (!name) return "";

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
          {greeting}{username && `, ${username}`}
        </h4>
        <small className="text-muted">
          Take your medicines on time for a healthier life.
        </small>
      </div>

      {/* Notifications and Profile */}
      <div className="d-flex align-items-center gap-3">
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light position-relative"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => {
              setShowNotifications((previous) => !previous);
              loadNotifications();
            }}
          >
            <i className="bi bi-bell fs-5"></i>

            {notifications.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="card shadow position-absolute end-0 mt-2"
              style={{
                width: "min(360px, 85vw)",
                maxHeight: "400px",
                overflowY: "auto",
                zIndex: 1050,
              }}
            >
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Medicine Reminders</strong>
                <button
                  className="btn-close"
                  aria-label="Close notifications"
                  onClick={() => setShowNotifications(false)}
                />
              </div>

              <div className="card-body p-2">
                {notifications.length === 0 ? (
                  <p className="text-muted text-center my-3">
                    No pending reminders.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border rounded p-3 mb-2"
                    >
                      <div className="fw-semibold">
                        {notification.medicineName}
                      </div>

                      <div className="small text-muted">
                        {notification.timeOfDay} medicine reminder
                      </div>

                      <p className="small mb-2 mt-2">
                        {notification.message}
                      </p>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleDismiss(notification.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="d-flex align-items-center justify-content-center border-0"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "#e9d5ff",
            color: "#6b21a8",
            fontWeight: "600",
            cursor: "pointer",
          }}
          title="Profile"
        >
          {initials}
        </button>
      </div>
    </div>
  );
}

export default Header;
