// app/_layout.tsx
import { useColorScheme } from "@/hooks/useColorScheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { AppState } from "react-native";
import "react-native-get-random-values";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Loading from "./screens/Misc/loading";

function RootNavigator() {

  
  const { loading, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const { uploadBacklogs, logError } = useBacklogLogger();

  const router = useRouter();
  const pathname = usePathname();

  // hide bottom nav bar (Android)
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {
      /* ignore if not supported */
    });
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // --- NEW: navigate to correct route once auth + fonts ready ---
  useEffect(() => {
  if (loading || !fontsLoaded) return;

  try {
    const protectedPath = "/screens"; // Your screens are here
    const publicPath = "/";

    if (isAuthenticated) {
      if (pathname === publicPath) {
        router.replace("/screens/HomeScreen");  // Changed!
      }
    } else {
      if (pathname?.startsWith(protectedPath)) {
        router.replace(publicPath);
      }
    }
  } catch (err) {
    console.warn("Navigation check failed:", err);
  }
}, [loading, fontsLoaded, isAuthenticated, pathname, router]);
  // -----------------------------------------------------------------

  // global error handling
  useEffect(() => {
    const onError = (error: any) => logError(error, "Global App Error");
    const onUnhandledRejection = (event: any) => {
      const reason = event?.reason ?? event;
      logError(reason, "Unhandled Promise Rejection");
    };

    ErrorUtils.setGlobalHandler(onError);

    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("unhandledrejection", onUnhandledRejection);
    }

    return () => {
      if (typeof globalThis.removeEventListener === "function") {
        globalThis.removeEventListener("unhandledrejection", onUnhandledRejection);
      }
    };
  }, [logError]);

  // upload backlogs when app backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") uploadBacklogs();
    });
    return () => subscription.remove();
  }, [uploadBacklogs]);


  // show loading screen until both fonts + auth finished
  if (!fontsLoaded || loading) {
    return <Loading />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          gestureEnabled: false,
        }}
      >
        {/* register both screens so router knows about them */}
        <Stack.Screen name="index" />
        {/* this registers your protected route (app/(app)/home.tsx) */}
        <Stack.Screen name="screens/HomeScreen" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LinearGradient
          colors={["#324762", "#0F2245"]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        >
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
              <RootNavigator />
              <StatusBar style="auto" />
            </SafeAreaView>
          </SafeAreaProvider>
        </LinearGradient>
      </NotificationProvider>
    </AuthProvider>
  );
}
