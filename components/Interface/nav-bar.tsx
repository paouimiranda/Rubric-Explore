import { usePathname, useRouter } from 'expo-router';
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const safeNavigate = (target: string) => {
    if (pathname !== target) {
      router.replace(target as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => safeNavigate(`/screens/HomeScreen`)}>
          <Image source={require('@/assets/images/home_icon.png')} style={styles.navIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => safeNavigate(`/screens/Quiz/Analytics/quiz-performance-overview`)}>
          <Image source={require('@/assets/images/analytics_icon.png')} style={styles.navIcon} />
        </TouchableOpacity>
        
        {/* Empty space placeholder - same size as other buttons */}
        <View style={[styles.navButton, {flex: 1.3}]}>
          <View style={styles.navIcon}/>
        </View>
        
        <TouchableOpacity style={styles.navButton} onPress={() => safeNavigate(`/screens/User/settings`)}>
          <Image source={require('@/assets/images/settings_icon.png')} style={styles.navIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => safeNavigate(`/screens/User/profile`)}>
          <Image source={require('@/assets/images/account_circle.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>

      {/* Protruding Middle Button - positioned over the empty space */}
      <View style={styles.middleButtonContainer}>
        <TouchableOpacity 
          style={styles.middleButton} 
          onPress={() => router.push(`/screens/Explore/explore`)}
          activeOpacity={0.8}
        >
          <Image 
            source={require('@/assets/images/discover_icon.png')} 
            style={styles.middleIcon} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BottomNavigation;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNav: {
    height: 60,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around', // This now spaces all 5 items evenly
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navButton: {
    padding: 10,
    flex: 1.1, // Each button takes equal space
    alignItems: 'center', // Center the icons within each space
  },
  navIcon: {
    //formerly 45
    width: 40,
    height: 40,
    tintColor: '#2D425E',
  },
  middleButtonContainer: {
    position: 'absolute',
    bottom: 3,
    left: '52%',
    marginLeft: -40,
    zIndex: 10,
  },
  middleButton: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 10,
    // borderWidth: 3,
    // borderColor: '#F0F0F0',
  },
  middleIcon: {
    width: 55,
    height: 55,
    tintColor: '#2D425E',
  },
});