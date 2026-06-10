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
  if (Platform.OS === "web" || initialized) return;

  initialized = true;
  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("parking-reminders", {
      name: "Parking reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function scheduleParkingReminder(spaceCode, hours) {
  if (Platform.OS === "web") return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Confirma tu espacio",
      body: `Tu tiempo estimado en ${spaceCode} ha terminado. Abre la app para confirmar si sigue ocupado.`,
      data: { spaceCode },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(hours * 3600, 60),
      channelId: "parking-reminders",
    },
  });
}
