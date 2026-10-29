
import { useState } from "react";
import { subscribeToPush } from "../utils/pushSubscription";

export default function PushTest() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function savePushSubscription() {
    setLoading(true);
    setMessage("");

    try {
      const subscription = await subscribeToPush();
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first.");
      }

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
        throw new Error(result.error || `Request failed: ${response.status}`);
      }

      setMessage("Push subscription saved successfully!");
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendTestNotification() {
    setLoading(true);
    setMessage("");

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
        throw new Error(result.error || `Request failed: ${response.status}`);
      }

      setMessage("Test notification sent! Check your desktop.");
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px" }}>
      <h2>Web Push Test</h2>

      <button
        type="button"
        onClick={savePushSubscription}
        disabled={loading}
      >
        Save Push Subscription
      </button>

      <button
        type="button"
        onClick={sendTestNotification}
        disabled={loading}
        style={{ marginLeft: "12px" }}
      >
        Send Test Notification
      </button>

      {loading && <p>Please wait...</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
