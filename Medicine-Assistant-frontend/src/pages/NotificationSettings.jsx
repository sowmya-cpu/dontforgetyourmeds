
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  requestNotificationPermission,
  showTestNotification,
} from "../utils/notificationUtils";

function NotificationSettings() {
  const [permission, setPermission] = useState("default");
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();

    if (result.success) {
      setPermission("granted");
      setRemindersEnabled(true);
      toast.success("Notifications enabled!");
    } else {
      setPermission(
        "Notification" in window
          ? Notification.permission
          : "unsupported"
      );
      toast.error(result.message);
    }
  };

  const handleTest = () => {
    const success = showTestNotification();

    if (success) {
      toast.success("Test notification sent!");
    } else {
      toast.error("Please enable browser notifications first.");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-2">Notification Settings</h2>

      <p className="text-muted mb-4">
        Manage notifications for your Medicine Assistant.
      </p>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="fw-semibold">Medicine Reminders</h5>

          <p className="text-muted">
            Enable browser notifications to receive medicine reminders.
          </p>

          <p>
            <strong>Browser permission:</strong>{" "}
            {permission === "granted"
              ? "Allowed"
              : permission === "denied"
              ? "Blocked"
              : permission === "unsupported"
              ? "Not supported"
              : "Not requested"}
          </p>

          <button
            className="btn btn-primary me-2 mb-2"
            onClick={handleEnable}
            disabled={
              permission === "granted" && remindersEnabled
            }
          >
            Enable Notifications
          </button>

          <button
            className="btn btn-outline-primary mb-2"
            onClick={handleTest}
            disabled={permission !== "granted"}
          >
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
