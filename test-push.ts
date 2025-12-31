// scripts/test-push.js
import { notificationService } from "./dist/modules/notifications/notification.service.js";
// import { initFCM } from "./src/modules/notifications/fcm.client.js"; // optional, but you already call init inside sendPushNotification indirectly

const userId = "6b41d98c-3872-49bd-a5c5-bce851b52c7f";

(async () => {
  try {
    await notificationService.sendPushNotification(
      userId,
      "Test from backend",
      "If you see this, push works! 🎉",
      { foo: "bar" }
    );

    console.log("Push trigger script completed");
  } catch (err) {
    console.error("Error sending test push:", err);
  } finally {
    process.exit(0);
  }
})();
