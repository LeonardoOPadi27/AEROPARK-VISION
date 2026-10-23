import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let initialized = false;

export async function prepareNotifications() {
  if (Platform.OS === "web") return false;

  if (!initialized) {
    initialized = true;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("parking-reminders", {
        name: "Recordatorios de estacionamiento",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelParkingReminder(spaceCode) {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content?.data?.spaceCode === spaceCode)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

export async function scheduleParkingReminder(spaceCode, dueAt) {
  if (Platform.OS === "web" || !dueAt) return false;
  await cancelParkingReminder(spaceCode);
  if (!(await prepareNotifications())) return false;

  const seconds = Math.max(Math.ceil((new Date(dueAt).getTime() - Date.now()) / 1000), 60);
  if (!Number.isFinite(seconds)) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Confirma tu espacio",
      body: `Revisa ${spaceCode} y confirma si sigue ocupado.`,
      data: { spaceCode },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: "parking-reminders",
    },
  });
  return true;
}
