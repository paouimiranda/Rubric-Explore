// app/_layout.tsx
import React from 'react'; // ✅ Added: Fixes TypeScript JSX children inference for ThemeProvider and AuthProvider
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Loading from './screens/Misc/loading'; // ✅ your custom loading screen

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const colorScheme = useColorScheme();

  // Control Android nav bar visibility
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // ⏳ If fonts or auth state still loading → show your custom loading screen
  if (!fontsLoaded || loading) {
    return <Loading />;
  }
  
  // 🔐 If user is authenticated → go straight to HomeScreen
  
  if (isAuthenticated) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="screens/HomeScreen" />
        </Stack>
      </ThemeProvider>
    );
  }

  // 🚪 If user not authenticated → show login (index.tsx)
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
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}