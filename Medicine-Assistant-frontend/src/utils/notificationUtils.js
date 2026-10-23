
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return {
      success: false,
      message: "Your browser does not support notifications.",
    };
  }

  if (Notification.permission === "granted") {
    return {
      success: true,
      message: "Notifications are already enabled.",
    };
  }

  if (Notification.permission === "denied") {
    return {
      success: false,
      message: "Notifications are blocked. Enable them in browser settings.",
    };
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    return {
      success: true,
      message: "Notifications enabled successfully!",
    };
  }

  return {
    success: false,
    message: "Notification permission was not granted.",
  };
}

export function showTestNotification() {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  new Notification("Medicine Assistant", {
    body: "Test notification successful! Your notification feature is working.",
    icon: "/icons/icon-192.png",
  });

  return true;
}
