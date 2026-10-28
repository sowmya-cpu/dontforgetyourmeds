import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { requestNotificationPermission } from "../utils/notificationUtils";
import { syncReminderSchedules } from "../utils/reminderSync";
import { subscribeToPush } from "../utils/pushSubscription";

function Profile() {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
  });

  const [remindersEnabled, setRemindersEnabled] = useState(
    () => localStorage.getItem("remindersEnabled") === "true"
  );

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const navigate = useNavigate();

  // Fetch profile information
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          "https://dontforgetyourmeds.onrender.com/api/auth/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
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

  // Check existing browser push subscription
  useEffect(() => {
    const checkPushSubscription = async () => {
      try {
        if (
          !("serviceWorker" in navigator) ||
          !("PushManager" in window)
        ) {
          setPushSubscribed(false);
          return;
        }

        const registration =
          await navigator.serviceWorker.ready;

        const subscription =
          await registration.pushManager.getSubscription();

        setPushSubscribed(Boolean(subscription));
      } catch (error) {
        console.error(
          "Push subscription check error:",
          error
        );
      }
    };

    checkPushSubscription();
  }, []);

  // Enable or disable medicine reminders
  const handleReminderToggle = async (event) => {
    const enabled = event.target.checked;

    if (enabled) {
      const result = await requestNotificationPermission();

      if (!result.success) {
        toast.error(result.message);
        return;
      }
    }

    localStorage.setItem(
      "remindersEnabled",
      String(enabled)
    );

    setRemindersEnabled(enabled);

    try {
      await syncReminderSchedules();
    } catch (error) {
      console.error("Reminder sync error:", error);
      toast.error(
        "Reminder setting saved, but server sync failed."
      );
      return;
    }

    toast.success(
      enabled
        ? "Medicine reminders enabled."
        : "Medicine reminders disabled."
    );
  };

  // Save browser push subscription
  const handleSavePushSubscription = async () => {
    setPushLoading(true);
    setPushMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const subscription = await subscribeToPush();

      const response = await fetch(
        "https://dontforgetyourmeds.onrender.com/api/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh,
            auth: subscription.keys?.auth,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Request failed: ${response.status}`
        );
      }

      // Change button to subscribed state
      setPushSubscribed(true);
      setPushMessage(
        "Push subscription saved successfully!"
      );

      toast.success("Push subscription saved successfully!");
    } catch (error) {
      setPushMessage(
        error.message || "Something went wrong."
      );

      toast.error(
        error.message || "Something went wrong."
      );
    } finally {
      setPushLoading(false);
    }
  };

  // Send test push notification
  const handleSendTestNotification = async () => {
    setPushLoading(true);
    setPushMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const response = await fetch(
        "https://dontforgetyourmeds.onrender.com/api/push/send-test",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Request failed: ${response.status}`
        );
      }

      setPushMessage(
        "Test notification sent! Check your desktop."
      );

      toast.success("Test notification sent!");
    } catch (error) {
      setPushMessage(
        error.message || "Something went wrong."
      );

      toast.error(
        error.message || "Something went wrong."
      );
    } finally {
      setPushLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-2">My Profile</h2>

      <p className="text-muted mb-4">
        View your account information and preferences.
      </p>

      {/* Account Details */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-4">Account Details</h5>

          <div className="mb-3">
            <small className="text-muted">Username</small>
            <div className="fw-semibold">
              {profile.username}
            </div>
          </div>

          <div>
            <small className="text-muted">Email</small>
            <div className="fw-semibold">
              {profile.email}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold mb-4">
            Notification Settings
          </h5>

          {/* Medicine Reminders */}
          <div className="d-flex justify-content-between align-items-center gap-3">
            <div>
              <h6 className="fw-bold mb-1">
                Medicine Reminders
              </h6>

              <p className="text-muted small mb-0">
                Enable notifications for your medicine schedule.
              </p>
            </div>

            <div className="form-check form-switch fs-4">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="medicineReminderSwitch"
                checked={remindersEnabled}
                onChange={handleReminderToggle}
              />
            </div>
          </div>

          <div className="mt-3">
            <span
              className={`badge ${
                remindersEnabled
                  ? "text-bg-success"
                  : "text-bg-secondary"
              }`}
            >
              {remindersEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <hr className="my-4" />

          {/* Desktop Push Notifications */}
          <h6 className="fw-bold">
            Push Notifications
          </h6>

          <p className="text-muted small">
            Register this browser to receive medicine reminder
            notifications. Allow notification permission when prompted.
          </p>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn ${
                pushSubscribed
                  ? "btn-success"
                  : "btn-primary"
              }`}
              onClick={handleSavePushSubscription}
              disabled={pushLoading || pushSubscribed}
            >
              {pushLoading
                ? "Please wait..."
                : pushSubscribed
                ? "Subscribed ✓"
                : "Save Push Subscription"}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleSendTestNotification}
              disabled={pushLoading || !pushSubscribed}
            >
              Send Test Notification
            </button>
          </div>

          {pushMessage && (
            <p className="small mt-3 mb-0">
              {pushMessage}
            </p>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="mt-4 d-lg-none">
        <button
          className="btn btn-danger"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Profile;