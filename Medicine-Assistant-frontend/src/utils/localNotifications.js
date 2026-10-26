import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// Request notification permission
export async function requestLocalNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error(
      "Local notifications work only in the installed mobile app."
    );
  }

  let permission = await LocalNotifications.checkPermissions();

  if (permission.display !== "granted") {
    permission = await LocalNotifications.requestPermissions();
  }

  if (permission.display !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  return true;
}

// Schedule a medicine reminder
export async function scheduleMedicineNotification({
  id,
  medicineName,
  reminderTime,
}) {
  await requestLocalNotificationPermission();

  const [hours, minutes] = reminderTime
    .split(":")
    .map(Number);

  const now = new Date();

  const scheduledDate = new Date();
  scheduledDate.setHours(hours, minutes, 0, 0);

  // If today's time has passed, schedule for tomorrow
  if (scheduledDate <= now) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Number(id),
        title: "Medicine Reminder",
        body: `Time to take ${medicineName}.`,
        schedule: {
          at: scheduledDate,
          allowWhileIdle: true,
        },
      },
    ],
  });
}

// Cancel a medicine reminder
export async function cancelMedicineNotification(id) {
  await LocalNotifications.cancel({
    notifications: [
      {
        id: Number(id),
      },
    ],
  });
}