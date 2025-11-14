// app/_layout.tsx
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Loading from './screens/Misc/loading';

// ✅ ADDED: Import backlog logger
import { useBacklogLogger } from "@/hooks/useBackLogLogger";

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // ✅ ADDED: Use backlog logger hook
  const { uploadBacklogs, logError } = useBacklogLogger();

  // Control Android nav bar visibility
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // ✅ ADDED: Global error handling
  useEffect(() => {
    const onError = (error: any) => {
      logError(error, "Global App Error");
    };

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

  // ✅ ADDED: Auto-upload backlogs when app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "background") uploadBacklogs();
    });

    return () => subscription.remove();
  }, [uploadBacklogs]);

  // ✅ FIXED: Handle navigation based on auth state WITHOUT remounting Stack
  useEffect(() => {
    if (loading || !fontsLoaded) return; // Don't navigate while loading

    if (isAuthenticated) {
      // User is authenticated → ensure they're on HomeScreen
      router.replace('/screens/HomeScreen');
    } else {
      // User is not authenticated → ensure they're on login
      router.replace('/');
    }
  }, [isAuthenticated, loading, fontsLoaded]);

  // ⏳ If fonts or auth state still loading → show your custom loading screen
  if (!fontsLoaded || loading) {
    return <Loading />;
  }

  // ✅ FIXED: Single Stack for all screens (no conditional rendering)
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" />
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
          colors={['#324762', '#0F2245']}
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