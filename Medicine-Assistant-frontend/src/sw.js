
import { precacheAndRoute } from "workbox-precaching";
import {
  getMedicinesByUser,
  saveReminderNotification,
} from "./database/medicineDB";

// Cache application files for offline use
precacheAndRoute(self.__WB_MANIFEST);

function normalizeReminderSlot(slot) {
  const value = slot?.toLowerCase().trim();

  if (!value) return slot;

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

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function savePushReminderDetails(data) {
  const email = data.userEmail?.trim().toLowerCase();
  const timeOfDay = normalizeReminderSlot(data.timeOfDay);
  const scheduledDate = new Date(data.scheduledAt);

  if (
    !email ||
    !["Morning", "Afternoon", "Night"].includes(timeOfDay) ||
    Number.isNaN(scheduledDate.getTime())
  ) {
    return false;
  }

  const date = formatLocalDate(scheduledDate);
  const medicines = await getMedicinesByUser(email);
  const matchingMedicines = medicines.filter((medicine) =>
    medicine.timesOfDay?.some(
      (slot) => normalizeReminderSlot(slot) === timeOfDay
    )
  );

  for (const medicine of matchingMedicines) {
    const message = `Time to take ${medicine.medicineName}. ${
      medicine.foodInstruction || ""
    }`.trim();

    await saveReminderNotification({
      reminderKey: `${email}-${medicine.id}-${timeOfDay}-${date}`,
      userEmail: email,
      medicineId: medicine.id,
      medicineName: medicine.medicineName,
      timeOfDay,
      message,
      scheduledAt: scheduledDate.toISOString(),
    });
  }

  return matchingMedicines.length > 0;
}

async function notifyReminderClients() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage({ type: "MEDICINE_REMINDERS_UPDATED" });
  });
}

// Receive Web Push notifications

self.addEventListener("push", (event) => {
  console.log("Push event received by service worker");

  let data = {
    title: "Medicine Assistant Test",
    body: "Your service worker push handler is working!",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        requireInteraction: true,
        data: { url: data.url || "/" },
      });

      try {
        if (await savePushReminderDetails(data)) {
          await notifyReminderClients();
        }
      } catch (error) {
        console.error("Web Push reminder persistence error:", error);
      }
    })()
  );
});


// Open the app when the user clicks a notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clients) => {
        const existingClient = clients.find(
          (client) => client.url === targetUrl
        );

        if (existingClient) {
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
