import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext'; // Add this import



export default function RootLayout() {
  useEffect(() => {
    // Hide Android navigation bar
    NavigationBar.setVisibilityAsync("hidden");
    // Let user swipe from edge to bring it back temporarily
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);
  
  
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }
  

  return (
    <AuthProvider>
      <LinearGradient
      colors={['#324762', '#0F2245']}
      start={{x: 1, y: 0.5}}
      end={{ x: 1, y: 0 }}
      style={{ 
        flex: 1}}>
      
      <SafeAreaProvider>
      <SafeAreaView style={{flex: 1}}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            // Disable screen transitions for native stack
            animation: 'fade',
            // Disable gestures that might cause transitions
            gestureEnabled: false,
            animationDuration: 2000,
          }} 
        />
        <StatusBar style="auto" />
      </ThemeProvider>
      </SafeAreaView>
      </SafeAreaProvider>
      </LinearGradient>
    </AuthProvider>
  );
}