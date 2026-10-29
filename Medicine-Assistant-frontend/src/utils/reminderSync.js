
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  getMedicinesByUser,
  saveReminderNotification,
} from "../database/medicineDB";
import { toast } from "react-toastify";

const API_URL = "https://dontforgetyourmeds.onrender.com/api/reminders/sync";

const STORAGE_KEY = "medicineNotificationIds";

const REMINDER_TIMES = {
  Morning: { hour: 8, minute: 0 },
  Afternoon: { hour: 14, minute: 20 },
  Night: { hour: 20, minute: 0 },
};

let localNotificationListenersRegistered = false;

export async function initializeLocalReminderListeners() {
  if (
    !Capacitor.isNativePlatform() ||
    localNotificationListenersRegistered
  ) {
    return;
  }

  const handleLocalNotification = async ({ notification }) => {
    const extra = notification.extra;

    if (
      !extra?.medicineId ||
      !extra.medicineName ||
      !extra.userEmail ||
      !extra.timeOfDay ||
      !extra.date
    ) {
      return;
    }

    await saveReminderDetails(extra);
  };

  await LocalNotifications.addListener(
    "localNotificationReceived",
    (event) => {
      handleLocalNotification(event).catch((error) => {
        console.error("Local reminder persistence error:", error);
      });
    }
  );
  await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (event) => {
      handleLocalNotification(event).catch((error) => {
        console.error("Local reminder persistence error:", error);
      });
    }
  );

  localNotificationListenersRegistered = true;
}

// Generate a stable numeric ID for each medicine, time slot, and date
function getNotificationId(medicineId, timeOfDay, date) {
  const value = `${medicineId}-${timeOfDay}-${date}`;

  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  // Keep IDs within the positive 32-bit integer range
  return hash % 2147483647;
}

// Parse YYYY-MM-DD as local midnight
function parseLocalDate(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

// Format date using local calendar date, not UTC
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Calculate the medicine course end date (exclusive)
function getCourseEndDate(medicine) {
  const start = parseLocalDate(medicine.startDate);
  const duration = Number(medicine.duration);

  if (!start || !Number.isFinite(duration) || duration < 1) {
    return null;
  }

  if (medicine.durationUnit === "Weeks") {
    start.setDate(start.getDate() + duration * 7);
  } else if (medicine.durationUnit === "Months") {
    start.setMonth(start.getMonth() + duration);
  } else {
    start.setDate(start.getDate() + duration);
  }

  return start;
}



// Schedule local notifications on Android/iOS
async function syncAndroidNotifications(medicines, email) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Cancel previously scheduled medicine reminders
  const savedIds = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );

  if (savedIds.length > 0) {
    await LocalNotifications.cancel({
      notifications: savedIds.map((id) => ({ id })),
    });
  }

  // Clear reminders when disabled
  if (localStorage.getItem("remindersEnabled") !== "true") {
    localStorage.setItem(STORAGE_KEY, "[]");
    return;
  }

  // Check notification permission
  let permission = await LocalNotifications.checkPermissions();

  if (permission.display !== "granted") {
    permission = await LocalNotifications.requestPermissions();
  }

  if (permission.display !== "granted") {
    localStorage.setItem(STORAGE_KEY, "[]");
    throw new Error("Notification permission was not granted");
  }

  await initializeLocalReminderListeners();

  const notifications = [];
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  medicines.forEach((medicine) => {
    if (
      !medicine.id ||
      !medicine.medicineName ||
      !medicine.startDate ||
      !medicine.duration
    ) {
      return;
    }

    const startDate = parseLocalDate(medicine.startDate);
    const courseEnd = getCourseEndDate(medicine);

    if (!startDate || !courseEnd) return;

    // Skip medicines whose course has ended
    if (courseEnd <= today) return;

    // Start scheduling today or on the future start date
    const scheduleDate = startDate > today ? startDate : today;

    (medicine.timesOfDay || []).forEach((timeOfDay) => {
      const time = REMINDER_TIMES[timeOfDay];

      if (!time) return;

      const date = new Date(scheduleDate);

      // Schedule one notification for each day of the course
      while (date < courseEnd) {
        const notificationDate = new Date(date);

        notificationDate.setHours(
          time.hour,
          time.minute,
          0,
          0
        );

        // Avoid scheduling a notification in the past
        if (notificationDate > now) {
          const notificationDateString = formatLocalDate(date);
          const reminderKey =
            `${email}-${medicine.id}-${timeOfDay}-${notificationDateString}`;
          const message = `Time to take ${medicine.medicineName}. ${
            medicine.foodInstruction || ""
          }`.trim();

          notifications.push({
            id: getNotificationId(
              medicine.id,
              timeOfDay,
              notificationDateString
            ),
            title: "Medicine Reminder",
            body: `Time to take ${medicine.medicineName}`,
            schedule: {
              at: notificationDate,
            },
            extra: {
              medicineId: medicine.id,
              medicineName: medicine.medicineName,
              userEmail: email,
              timeOfDay,
              date: notificationDateString,
              reminderKey,
              message,
              scheduledAt: notificationDate.toISOString(),
            },
          });
        }

        date.setDate(date.getDate() + 1);
      }
    });
  });

  // Schedule notifications
  if (notifications.length > 0) {
    await LocalNotifications.schedule({
      notifications,
    });
  }

  // Save IDs so reminders can be cancelled or updated
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(notifications.map((item) => item.id))
  );
}

function normalizeReminderSlot(slot) {
  const value = slot?.toLowerCase().trim();

  if (value.includes("morning") || value.includes("breakfast")) {
    return "Morning";
  }

  if (value.includes("afternoon") || value.includes("lunch")) {
    return "Afternoon";
  }

  if (value.includes("night") || value.includes("dinner")) {
    return "Night";
  }

  return slot;
}

async function saveReminderDetails(reminder) {
  await saveReminderNotification({
    reminderKey: reminder.reminderKey,
    userEmail: reminder.userEmail.trim().toLowerCase(),
    medicineId: reminder.medicineId,
    medicineName: reminder.medicineName,
    timeOfDay: reminder.timeOfDay,
    message: reminder.message,
    scheduledAt: reminder.scheduledAt,
  });

  window.dispatchEvent(new Event("medicine-reminders-updated"));
}

// Main reminder sync function
export async function syncReminderSchedules() {
  const email = localStorage.getItem("email")?.trim().toLowerCase();

  if (!email) {
    toast.error("Please log in again.");
    return;
  }

  const medicines = await getMedicinesByUser(email);

  const remindersEnabled =
    localStorage.getItem("remindersEnabled") === "true";

  // Handle local phone notifications
  await syncAndroidNotifications(medicines, email);

  // Keep existing desktop backend sync
  const activeSlots = remindersEnabled
  ? [
      ...new Set(
        medicines.flatMap((medicine) =>
          (medicine.timesOfDay || [])
            .map(normalizeReminderSlot)
            .filter((slot) =>
              ["Morning", "Afternoon", "Night"].includes(slot)
            )
        )
      ),
    ]
  : [];

  const token = localStorage.getItem("token");

  // Local reminders do not require a backend login token
  if (!token) {
    console.warn(
      "No login token. Local reminders were handled."
    );
    return;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ activeSlots }),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Reminder sync failed: ${error}`
    );
  }

  return response.json();
}
