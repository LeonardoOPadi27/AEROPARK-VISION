import { Image, StyleSheet, View } from "react-native";

const zoneImages = {
  A: require("../../assets/zone-a.jpg"),
  B: require("../../assets/zone-b.jpg"),
};

export default function ZoneImage({ zoneId, height = 112, style }) {
  const source = zoneImages[zoneId];
  if (!source) return null;

  return (
    <View style={[styles.frame, { height }, style]}>
      <Image source={source} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 6,
    backgroundColor: "#151719",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
