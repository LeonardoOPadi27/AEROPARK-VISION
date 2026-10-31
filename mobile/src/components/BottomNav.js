import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { CarFront, House, LayoutGrid, UserRound } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";

const items = [
  { key: "home", label: "Inicio", icon: House },
  { key: "spaces", label: "Espacios", icon: LayoutGrid },
  { key: "my-space", label: "Mi espacio", icon: CarFront },
  { key: "profile", label: "Perfil", icon: UserRound },
];
const ACTIVE_LENS_SIZE = 48;

export default function BottomNav({ activeTab, onChange }) {
  const [shellWidth, setShellWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeTab),
  );
  const animatedIndex = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: activeIndex,
      damping: 18,
      mass: 0.9,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, animatedIndex]);

  const itemWidth = useMemo(
    () => (shellWidth ? shellWidth / items.length : 0),
    [shellWidth],
  );

  const highlightTranslate = itemWidth
    ? animatedIndex.interpolate({
        inputRange: Array.from({ length: items.length }, (_, index) => index),
        outputRange: Array.from(
          { length: items.length },
          (_, index) => itemWidth * index + (itemWidth - ACTIVE_LENS_SIZE) / 2,
        ),
      })
    : 0;

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.shell}
        onLayout={(event) => setShellWidth(event.nativeEvent.layout.width)}
      >
        {itemWidth ? (
          <Animated.View
            style={[
              styles.activeLens,
              {
                width: ACTIVE_LENS_SIZE,
                height: ACTIVE_LENS_SIZE,
                transform: [{ translateX: highlightTranslate }],
              },
            ]}
          />
        ) : null}

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={({ hovered, pressed }) => [
                styles.item,
                (hovered || pressed) && styles.itemHovered,
              ]}
            >
              <View style={styles.iconWrap}>
                <Icon
                  size={20}
                  color={isActive ? colors.black : colors.textMuted}
                  strokeWidth={2.2}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: spacing.screen,
    bottom: 12,
    left: spacing.screen,
  },
  shell: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(7,8,10,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  activeLens: {
    position: "absolute",
    top: 8,
    left: 0,
    borderRadius: 24,
    backgroundColor: colors.text,
    shadowColor: "#fff",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  item: {
    flex: 1,
    height: ACTIVE_LENS_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  itemHovered: {
    opacity: 0.8,
  },
  iconWrap: {
    width: ACTIVE_LENS_SIZE,
    height: ACTIVE_LENS_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
