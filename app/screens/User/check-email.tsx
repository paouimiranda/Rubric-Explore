import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CheckEmailScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Mail illustration */}
      <Image
        source={{
          uri: "https://cdn-icons-png.flaticon.com/512/561/561127.png",
        }}
        style={styles.image}
      />

      <Text style={styles.title}>Check Your Mail 📩</Text>
      <Text style={styles.text}>
        We’ve sent a verification link to your new email address.{"\n"}
        Please check your inbox and click the link to confirm your change.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/screens/HomeScreen")}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>Didn’t get the email? Go back and resend</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 30,
    tintColor: "#5a3dff",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  text: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#5a3dff",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkText: {
    color: "#5a3dff",
    fontSize: 15,
    textAlign: "center",
  },
});