
import {
  getAllMedicines,
  saveReminderNotification,
} from "../database/medicineDB";
import { showTestNotification } from "./notificationUtils";

const REMINDER_TIMES = {
  Morning: { hour: 8, minute: 0 },
  Afternoon: { hour: 13, minute: 0 },
  Night: { hour: 20, minute: 0 },
};

const GRACE_PERIOD_MS = 5 * 60 * 1000;

let reminderTimer = null;
const notifiedReminders = new Set();

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function checkMedicineReminders() {
  if (localStorage.getItem("remindersEnabled") !== "true") {
    return;
  }

  const medicines = await getAllMedicines();
  const now = new Date();
  const today = getTodayKey();

  for (const medicine of medicines) {
    if (!medicine.timesOfDay?.length) continue;

    for (const slot of medicine.timesOfDay) {
      const reminderTime = REMINDER_TIMES[slot];
      if (!reminderTime) continue;

      const scheduled = new Date(now);
      scheduled.setHours(
        reminderTime.hour,
        reminderTime.minute,
        0,
        0
      );

      if (now < scheduled) continue;

      const reminderKey = `${today}-${medicine.id}-${slot}`;
      const elapsedMs = now.getTime() - scheduled.getTime();

      // Save every due reminder for persistent in-app display.
      await saveReminderNotification({
        reminderKey,
        medicineId: medicine.id,
        medicineName: medicine.medicineName || "Your medicine",
        timeOfDay: slot,
        scheduledDate: today,
        scheduledAt: scheduled.toISOString(),
        message: `Your scheduled ${slot.toLowerCase()} medicine reminder is due.`,
      });

      // System notification only within the 5-minute grace period.
      if (
        elapsedMs <= GRACE_PERIOD_MS &&
        !notifiedReminders.has(reminderKey) &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Medicine Assistant 💊", {
          body: `It's time for your scheduled ${slot.toLowerCase()} medicine reminder.`,
          icon: "/icons/icon-192.png",
          requireInteraction: true,
        });

        notifiedReminders.add(reminderKey);
      }
    }
  }
}

export function startReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer);

  checkMedicineReminders().catch(console.error);

  reminderTimer = setInterval(() => {
    checkMedicineReminders().catch(console.error);
  }, 30_000);
}

export function stopReminderScheduler() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}
