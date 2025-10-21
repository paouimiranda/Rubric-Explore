import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const LEVEL_COUNT = 100;

// Color scheme for different levels
const LEVEL_COLORS = [
  { bg: '#90EE90', dark: '#FF999A' }, // Light green
  { bg: '#87CEEB', dark: '#4682B4' }, // Sky blue
  { bg: '#F0E68C', dark: '#DAA520' }, // Khaki/Yellow
  { bg: '#FFA07A', dark: '#FF6347' }, // Light salmon
  { bg: '#DDA0DD', dark: '#9370DB' }, // Plum
  { bg: '#98FB98', dark: '#00FA9A' }, // Pale green
  { bg: '#F0F8FF', dark: '#6495ED' }, // Alice blue
  { bg: '#FFEFD5', dark: '#FFE4B5' }, // Papaya whip
];

const LevelMap = () => {
  const scrollRef = useRef<ScrollView>(null);
  const boxHeight = 190; // Increased height for better spacing

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  });

  const [unlockedLevel, setUnlockedLevel] = useState<number>(7);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set([1, 2])); // Completed levels

  useEffect(() => {
    scrollToLevel(selectedLevel);
  }, []);

  const scrollToLevel = (level: number) => {
    scrollRef.current?.scrollTo({
      y: (LEVEL_COUNT - level) * boxHeight - 300,
      animated: true,
    });
  };

  const handleLevelPress = (level: number) => {
    if (level <= unlockedLevel) {
      setSelectedLevel(level);
      scrollToLevel(level);
    }
  };

  const getLevelColor = (level: number) => {
    return LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];
  };

  const renderCheckmarks = (level: number, isCompleted: boolean, isUnlocked: boolean) => {
    if (!isUnlocked) return null;
    
    return (
      <View style={styles.checkmarkContainer}>
        {/* First checkmark - always visible for unlocked levels */}
        <View style={[styles.checkmark, isCompleted && styles.completedCheckmark]}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
        
        {/* Second checkmark - only for completed levels */}
        {/* {isCompleted && (
          <View style={[styles.checkmark, styles.smallCheckmark, styles.completedCheckmark]}>
            <Text style={[styles.checkmarkText, styles.smallCheckmarkText]}>✓</Text>
          </View>
        )} */}
        
        {/*Special badge for current level*/}
        {level === unlockedLevel && !isCompleted && (
          <View style={[styles.badge]}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        )}
      </View>
    );
  };

  const renderConnectingLine = (index: number) => {
    if (index === LEVEL_COUNT - 1) return null; // No line after the last level
    
    return (
      <View style={styles.connectingLine}>
        <View style={styles.dottedLine} />
      </View>
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: LEVEL_COUNT }, (_, i) => {
        const level = LEVEL_COUNT - i;
        const isLocked = level > unlockedLevel;
        const isSelected = level === selectedLevel;
        const isCompleted = completedLevels.has(level);
        const colors = getLevelColor(level);

        return (
          <View key={level} style={styles.levelContainer}>
            <TouchableOpacity
              style={[
                styles.levelBox,
                { backgroundColor: isLocked ? '#6f6f6f6e' : colors.bg }, // Light pink for locked
                isSelected && styles.selectedLevel,
                isLocked && styles.lockedLevel,
              ]}
              onPress={() => handleLevelPress(level)}
              activeOpacity={isLocked ? 1 : 0.7}
              disabled={isLocked}
            >
              <Text style={[styles.levelText, isLocked && styles.lockedText]}>
                LEVEL {level}
              </Text>
              
              {isLocked ? (
                <View style={styles.lockContainer}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              ) : (
                renderCheckmarks(level, isCompleted, !isLocked)
              )}
            </TouchableOpacity>
            
            {renderConnectingLine(i)}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default LevelMap;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 100,
    paddingTop: 50,
 // Dark blue background like in the image
  },
  levelContainer: {
    alignItems: 'center',
  },
  levelBox: {
    width: width * 0.75,
    height: 150,
    borderRadius: 20,
    marginVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    flexDirection: 'row',
  },
  selectedLevel: {
    borderWidth: 3,
    borderColor: '#FFD700',
    elevation: 12,
  },
  lockedLevel: {
    opacity: 0.8,
  },
  levelText: {
    fontSize: 50,
    fontFamily: 'BebasNeue_400Regular',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  lockedText: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  checkmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    gap: 8,
  },
  checkmark: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  completedCheckmark: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderColor: '#4CAF50',
  },
  smallCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  smallCheckmarkText: {
    fontSize: 14,
  },
  badge: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFC107',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 30,
    opacity: 0.8,
  },
  connectingLine: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dottedLine: {
    width: 3,
    height: 20,
    backgroundColor: '#5D6D7E',
    opacity: 0.6,
  },
});