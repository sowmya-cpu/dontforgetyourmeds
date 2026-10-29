
import { openDB } from "idb";

const DB_NAME = "MedicineAssistantDB";
const DB_VERSION = 3;
const STORE_NAME = "medicines";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    // Existing medicines store
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    }

    // New dose history store
    if (
      oldVersion < 2 &&
      !db.objectStoreNames.contains("doseHistory")
    ) {
      const store = db.createObjectStore("doseHistory", {
        keyPath: "id",
        autoIncrement: true,
      });

      store.createIndex(
        "scheduledDose",
        ["medicineId", "scheduledDate", "timeOfDay"],
        { unique: true }
      );
    }

    // Notifications store
    if (
      oldVersion < 3 &&
      !db.objectStoreNames.contains("notifications")
    ) {
      const store = db.createObjectStore("notifications", {
        keyPath: "id",
        autoIncrement: true,
      });

      store.createIndex("reminderKey", "reminderKey", {
        unique: true,
      });
    }
  },
});

export async function saveMedicine(medicine) {
  const db = await dbPromise;

  const id = await db.add(STORE_NAME, {
    ...medicine,
    createdAt: new Date().toISOString(),
  });

  return id;
}

export async function getAllMedicines() {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

export async function getMedicinesByUser(email) {
  const db = await dbPromise;
  const medicines = await db.getAll(STORE_NAME);

  return medicines.filter(
    (medicine) => medicine.userEmail === email
  );
}

export async function getMedicineById(id) {
  const db = await dbPromise;
  return db.get(STORE_NAME, id);
}

// delete a medicine by its id
export async function deleteMedicine(id) {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
}

export async function updateMedicine(medicine) {
  const db = await dbPromise;
  const email = localStorage.getItem("email")?.trim().toLowerCase();

  if (!email) {
    throw new Error("Please log in again.");
  }

  const existingMedicine = await db.get(STORE_NAME, medicine.id);

  if (
    !existingMedicine ||
    existingMedicine.userEmail?.trim().toLowerCase() !== email
  ) {
    throw new Error("You cannot update this medicine.");
  }

  await db.put(STORE_NAME, {
    ...existingMedicine,
    ...medicine,
    userEmail: email,
  });
}


// Mark a scheduled dose as taken
export async function markDoseAsTaken(
  medicineId,
  scheduledDate,
  timeOfDay
) {
  const db = await dbPromise;

  const existing = await db
    .transaction("doseHistory")
    .store
    .index("scheduledDose")
    .get([medicineId, scheduledDate, timeOfDay]);

  if (existing) return false;

  await db.add("doseHistory", {
    medicineId,
    scheduledDate,
    timeOfDay,
    status: "taken",
    takenAt: new Date().toISOString(),
  });

  return true;
}

// Get dose history for a specific date
export async function getDoseHistoryForDate(scheduledDate) {
  const db = await dbPromise;
  const records = await db.getAll("doseHistory");

  return records.filter(
    (record) => record.scheduledDate === scheduledDate
  );
}



/**
 * Save a reminder notification.
 * Prevents duplicate records for the same reminder.
 */
export async function saveReminderNotification(reminder) {
  const db = await dbPromise;
  const tx = db.transaction("notifications", "readwrite");
  const store = tx.store;

  const existing = await store.index("reminderKey").get(
    reminder.reminderKey
  );

  if (existing) {
    await tx.done;
    return existing;
  }

  const notification = {
    ...reminder,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const id = await store.add(notification);
  await tx.done;

  return { ...notification, id };
}

/**
 * Get notifications that have not been dismissed.
 */
export async function getPendingNotifications(email) {
  const db = await dbPromise;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) return [];

  const notifications = await db.getAll("notifications");

  return notifications.filter((notification) => {
    const notificationEmail = notification.userEmail
      ?.trim()
      .toLowerCase();

    return (
      notificationEmail === normalizedEmail &&
      !notification.dismissed &&
      notification.status !== "dismissed"
    );
  });
}

/**
 * Dismiss a notification without marking the medicine as taken.
 */
export async function dismissNotification(id) {
  const db = await dbPromise;
  const notification = await db.get("notifications", id);

  if (!notification) return false;

  await db.put("notifications", {
    ...notification,
    dismissed: true,
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
  });

  return true;
}
