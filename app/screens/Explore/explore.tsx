// File: screens/ExploreScreen.tsx
import { useJourney, useXPProgress } from '@/hooks/useJourney';
import { Level } from '@/services/journey-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LeaderboardTab from './leaderboard-tab';
import ShopTab from './shop-tab';

const { width, height } = Dimensions.get('window');

// Tab options for navigation
const TABS = [
  { id: 'journey', label: 'Journey', icon: 'rocket' as const },
  { id: 'shop', label: 'Shop', icon: 'cart' as const },
  { id: 'leaderboard', label: 'Scores', icon: 'trophy' as const },
];

const ExploreScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('journey');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Tab content animations
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslateX = useRef(new Animated.Value(0)).current;
  
  // Tab pill slider animation
  const initialTabIndex = TABS.findIndex(t => t.id === 'journey');
  const pillSlideAnim = useRef(new Animated.Value(initialTabIndex)).current;
  
  // Tab button animations - create refs for each tab
  const tabAnimations = useRef(
    TABS.reduce((acc, tab) => {
      acc[tab.id] = {
        scale: new Animated.Value(tab.id === 'journey' ? 1 : 0.95),
        opacity: new Animated.Value(tab.id === 'journey' ? 1 : 0.7),
      };
      return acc;
    }, {} as Record<string, { scale: Animated.Value; opacity: Animated.Value }>)
  ).current;

  const router = useRouter();
  
  // Load journey data from Firestore
  const { levels, userStats, userProgress, loading, error, reload } = useJourney();
  const xpData = useXPProgress(userStats);
  
  // Generate static star positions
  const stars = useRef(
    Array.from({ length: 20 }, () => ({
      left: Math.random() * width,
      top: Math.random() * height,
      opacity: useRef(new Animated.Value(Math.random())).current,
    }))
  ).current;

  // Log when stats change
  useEffect(() => {
    console.log('=== STATS UPDATED IN EXPLORE SCREEN ===', {
      shards: userStats?.shards,
      energy: userStats?.energy,
      currentLevel: userProgress?.currentLevel,
      timestamp: new Date().toISOString()
    });
  }, [userStats, userProgress]);

  useFocusEffect(
    useCallback(() => {
      console.log('=== EXPLORE SCREEN FOCUSED ===', new Date().toISOString());
      console.log('Current stats before reload:', {
        shards: userStats?.shards,
        energy: userStats?.energy,
      });
      reload();
      
      // Return cleanup function
      return () => {
        console.log('=== EXPLORE SCREEN UNFOCUSED ===', new Date().toISOString());
      };
    }, [reload])
  );

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Starfield animation
    stars.forEach((star) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.2,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handleTabPress = (tabId: string) => {
    if (tabId === activeTab) return;

    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    const newIndex = TABS.findIndex(t => t.id === tabId);
    const direction = newIndex > currentIndex ? 1 : -1;

    // Animate the sliding pill background
    Animated.spring(pillSlideAnim, {
      toValue: newIndex,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Animate tab buttons
    // Shrink and fade out the old active tab
    Animated.parallel([
      Animated.spring(tabAnimations[activeTab].scale, {
        toValue: 0.95,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(tabAnimations[activeTab].opacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Grow and fade in the new active tab
    Animated.parallel([
      Animated.spring(tabAnimations[tabId].scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(tabAnimations[tabId].opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out current content
    Animated.parallel([
      Animated.timing(tabContentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tabContentTranslateX, {
        toValue: -50 * direction,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch tab
      setActiveTab(tabId);
      
      // Reset position for animation in
      tabContentTranslateX.setValue(50 * direction);
      
      // Animate in new content
      Animated.parallel([
        Animated.timing(tabContentOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(tabContentTranslateX, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleLevelPress = (level: Level) => {
    if (!level.unlocked) {
      Alert.alert('Locked', 'Complete previous levels to unlock this one!');
      return;
    }

    console.log('=== NAVIGATING TO QUIZ ===', {
      levelId: level.id,
      quizId: level.quizId,
    });

    router.push({
      pathname: './journey-quiz-play',
      params: {
        quizId: level.quizId,
        levelId: level.id.toString(),
        levelTitle: level.title,
        isJourneyLevel: 'true',
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={['#0A1C3C', '#1a2f4f', '#324762']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={['#0A1C3C', '#1a2f4f', '#324762']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Ionicons name="alert-circle" size={64} color="#f5576c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0A1C3C', '#1a2f4f', '#324762']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Starfield */}
      {stars.map((star, index) => (
        <Animated.View
          key={index}
          style={[
            styles.star,
            {
              left: star.left,
              top: star.top,
              opacity: star.opacity,
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <View style={styles.tabPillContainer}>
            {/* Animated sliding background pill */}
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  transform: [
                    {
                      translateX: pillSlideAnim.interpolate({
                        inputRange: [0, TABS.length - 1],
                        outputRange: [0, (width - 56) / TABS.length * (TABS.length - 1)],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.slidingPillGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            {/* Tab buttons */}
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.8}
                style={styles.tabButton}
              >
                <View style={styles.tabButtonContent}>
                  <Ionicons 
                    name={tab.icon} 
                    size={18} 
                    color={activeTab === tab.id ? '#fff' : '#aaa'} 
                  />
                  <Text style={activeTab === tab.id ? styles.tabTextActive : styles.tabTextInactive}>
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Animated Tab Content Container */}
        <Animated.View
          style={[
            styles.tabContentContainer,
            {
              opacity: tabContentOpacity,
              transform: [{ translateX: tabContentTranslateX }],
            },
          ]}
        >
          {/* CONDITIONAL CONTENT BASED ON ACTIVE TAB */}
          {activeTab === 'journey' ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Your Journey</Text>
                <Text style={styles.subtitle}>
                  {userProgress?.currentLevel === 1 
                    ? 'Begin your cosmic adventure' 
                    : `Continue your cosmic adventure`}
                </Text>
              </View>

              {/* Stats Bar */}
              <View style={styles.statsContainer}>
                {/* Shards */}
                <View style={styles.compactStatCard}>
                  <LinearGradient
                    colors={['#fbbf24', '#f59e0b']}
                    style={styles.compactStatIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="diamond" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.compactStatValue}>{userStats?.shards || 0}</Text>
                </View>

                {/* Energy */}
                <View style={styles.compactStatCard}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.compactStatIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="flash" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.compactStatValue}>
                    {userStats?.energy.current || 0}/{userStats?.energy.max || 5}
                  </Text>
                </View>

                {/* XP Bar */}
                <View style={styles.expBarContainer}>
                  <View style={styles.expBarHeader}>
                    <Text style={styles.expLevel}>Lv. {xpData.currentLevel}</Text>
                    <Text style={styles.expText}>
                      {xpData.currentXP}/{xpData.xpToNextLevel}
                    </Text>
                  </View>
                  <View style={styles.expBarBackground}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={[
                        styles.expBarFill,
                        { width: `${xpData.xpProgress}%` },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              </View>

              {/* Level Path */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {levels.map((level, index) => (
                  <LevelNode
                    key={level.id}
                    level={level}
                    index={index}
                    isLast={index === levels.length - 1}
                    onPress={() => handleLevelPress(level)}
                  />
                ))}
                
                {/* Spacer at bottom */}
                <View style={{ height: 100 }} />
              </ScrollView>
            </>
          ) : activeTab === 'leaderboard' ? (
            <LeaderboardTab />
          ) : activeTab === 'shop' ? (
            <ShopTab/>
          ): null }
        </Animated.View>
      </Animated.View>
    </View>
  );
};

interface LevelNodeProps {
  level: Level;
  index: number;
  isLast: boolean;
  onPress: () => void;
}

const LevelNode: React.FC<LevelNodeProps> = ({ level, index, isLast, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const isLeft = index % 2 === 0;
  const isCurrentLevel = level.unlocked && !level.completed;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 150,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Pulse for current level
    if (isCurrentLevel) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000 + index * 200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000 + index * 200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.levelContainer}>
      {/* Connection Path */}
      {!isLast && (
        <View style={[styles.pathLine, isLeft ? styles.pathLineLeft : styles.pathLineRight]}>
          {[...Array(3)].map((_, i) => (
            <View key={i}>
              <LinearGradient
                colors={
                  level.completed
                    ? ['rgba(102, 126, 234, 0.6)', 'rgba(118, 75, 162, 0.6)']
                    : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.15)']
                }
                style={styles.pathDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
          ))}
        </View>
      )}

      {/* Level Card */}
      <Animated.View
        style={[
          styles.levelWrapper,
          isLeft ? styles.levelLeft : styles.levelRight,
          {
            transform: [
              { scale: scaleAnim },
              { scale: isCurrentLevel ? pulseAnim : 1 },
              { translateY: floatAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          disabled={!level.unlocked}
          activeOpacity={0.8}
          onPress={onPress}
          style={styles.levelTouchable}
        >
          {/* Glow effect */}
          {isCurrentLevel && (
            <LinearGradient
              colors={[level.gradient[0], level.gradient[1], level.gradient[0]]}
              style={styles.glowEffect}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          {/* Card */}
          <LinearGradient
            colors={
              level.unlocked
                ? [
                    `${level.gradient[0]}40`, // 25% opacity
                    `${level.gradient[1]}40`,
                  ]
                : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
            }
            style={[
              styles.levelCard,
              !level.unlocked && styles.levelCardLocked,
              isCurrentLevel && styles.levelCardCurrent,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Icon */}
            <View style={styles.levelIconContainer}>
              <LinearGradient
                colors={level.unlocked ? level.gradient : ['#555', '#333']}
                style={styles.levelIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {level.unlocked ? (
                  level.completed ? (
                    <Ionicons name="checkmark-circle" size={32} color="#fff" />
                  ) : (
                    <Ionicons name="planet" size={32} color="#fff" />
                  )
                ) : (
                  <Ionicons name="lock-closed" size={32} color="#aaa" />
                )}
              </LinearGradient>
            </View>

            {/* Info */}
            <View style={styles.levelInfo}>
              <Text style={[styles.levelTitle, !level.unlocked && styles.levelTitleLocked]}>
                Level {level.id}
              </Text>
              <Text style={[styles.levelSubtitle, !level.unlocked && styles.levelSubtitleLocked]}>
                {level.title}
              </Text>

              {/* Stars */}
              {level.unlocked && (
                <View style={styles.starsContainer}>
                  {[1, 2, 3].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= level.stars ? 'star' : 'star-outline'}
                      size={16}
                      color={star <= level.stars ? '#fee140' : '#555'}
                      style={styles.starIcon}
                    />
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1C3C',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  tabContentContainer: {
    flex: 1,
  },
  loadingText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    color: '#aaa',
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    color: '#f5576c',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabPillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    width: `${100 / TABS.length}%`,
    zIndex: 0,
  },
  slidingPillGradient: {
    flex: 1,
    borderRadius: 26,
  },
  tabButton: {
    flex: 1,
    zIndex: 1,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  tabTextActive: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  tabTextInactive: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    color: '#aaa',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 8,
    alignItems: 'center',
  },
  compactStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  compactStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatValue: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  expBarContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expLevel: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
  },
  expText: {
    fontFamily: 'Montserrat',
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
  },
  expBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  expBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  levelContainer: {
    marginBottom: 50,
    position: 'relative',
  },
  pathLine: {
    position: 'absolute',
    top: 120,
    zIndex: 0,
    gap: 10,
  },
  pathLineLeft: {
    left: 90,
  },
  pathLineRight: {
    right: 90,
  },
  pathDot: {
    width: 8,
    height: 7,
    borderRadius: 4,
  },
  levelWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  levelLeft: {
    alignItems: 'flex-start',
  },
  levelRight: {
    alignItems: 'flex-end',
  },
  levelTouchable: {
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    opacity: 0.3,
    zIndex: 0,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 120,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  levelCardLocked: {
    opacity: 0.5,
  },
  levelCardCurrent: {
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  levelIconContainer: {
    marginRight: 16,
  },
  levelIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontFamily: 'Montserrat',
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  levelTitleLocked: {
    color: '#888',
  },
  levelSubtitle: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  levelSubtitleLocked: {
    color: '#666',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  starIcon: {
    marginRight: 2,
  },
});

export default ExploreScreen;