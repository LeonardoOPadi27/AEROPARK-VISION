import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "aeropark_mobile_token";
const USER_KEY = "aeropark_mobile_user";

export async function saveSession(token, user) {
  if (typeof AsyncStorage.multiSet === "function") {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    return;
  }

  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadSession() {
  let token;
  let rawUser;

  if (typeof AsyncStorage.multiGet === "function") {
    [[, token], [, rawUser]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  } else {
    [token, rawUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
  }

  return {
    token,
    user: rawUser ? JSON.parse(rawUser) : null,
  };
}

export async function clearSession() {
  if (typeof AsyncStorage.multiRemove === "function") {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    return;
  }

  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}
