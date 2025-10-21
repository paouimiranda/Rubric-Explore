import ExploreHeader from '@/components/Interface/explore-header';
import LevelMap from '@/components/Interface/level-map';
import BottomNavigation from '@/components/Interface/nav-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';


const Explore = () => {
  return (
    <LinearGradient
        colors={['#324762', '#0A1C3C']}
        start={{x: 1, y: 1}}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1}}
        >

    <SafeAreaView style={styles.container}>
      <ExploreHeader 
        points={1250}
        energy={4}
        maxEnergy={5}
        streak={7}
        level={12}
      />
      <LevelMap />
      <BottomNavigation/>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Match the dark theme
  },
});

export default Explore;