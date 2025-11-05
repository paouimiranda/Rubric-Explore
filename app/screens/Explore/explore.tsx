import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Screen dimensions for responsive layout
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // Two columns with padding

// Type definitions for quiz data structure
interface Quiz {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: number;
  completed: boolean;
  stars: number;
  totalQuestions: number;
  category: string;
}

// Mock quiz data - replace with API calls in production
const MOCK_QUIZZES: Quiz[] = [
  {
    id: '1',
    title: 'Space Exploration',
    description: 'Journey through the cosmos',
    thumbnail: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400',
    difficulty: 'easy',
    level: 1,
    completed: true,
    stars: 3,
    totalQuestions: 10,
    category: 'Science',
  },
  {
    id: '2',
    title: 'Ancient Civilizations',
    description: 'Discover lost empires',
    thumbnail: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400',
    difficulty: 'medium',
    level: 2,
    completed: false,
    stars: 0,
    totalQuestions: 15,
    category: 'History',
  },
  {
    id: '3',
    title: 'Quantum Physics',
    description: 'Explore particle behavior',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    difficulty: 'hard',
    level: 3,
    completed: false,
    stars: 0,
    totalQuestions: 20,
    category: 'Science',
  },
  {
    id: '4',
    title: 'World Geography',
    description: 'Master continents and oceans',
    thumbnail: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400',
    difficulty: 'easy',
    level: 1,
    completed: true,
    stars: 2,
    totalQuestions: 12,
    category: 'Geography',
  },
  {
    id: '5',
    title: 'Classical Music',
    description: 'Learn about great composers',
    thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400',
    difficulty: 'medium',
    level: 2,
    completed: false,
    stars: 0,
    totalQuestions: 10,
    category: 'Arts',
  },
  {
    id: '6',
    title: 'Marine Biology',
    description: 'Dive into ocean life',
    thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
    difficulty: 'medium',
    level: 2,
    completed: false,
    stars: 0,
    totalQuestions: 18,
    category: 'Science',
  },
];

// Difficulty color schemes matching gamification theme
const DIFFICULTY_COLORS = {
  easy: ['#00f2fe', '#4facfe'],
  medium: ['#fa709a', '#fee140'],
  hard: ['#f093fb', '#f5576c'],
};

// Quiz card component with glassmorphic design
const QuizCard: React.FC<{ quiz: Quiz; index: number }> = ({ quiz, index }) => {
  // Animation value for fade-in effect
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Staggered animation based on card index
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100, // Stagger by 100ms per card
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8}>
        {/* Glassmorphic card background */}
        <View style={styles.card}>
          {/* Quiz thumbnail with overlay */}
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: quiz.thumbnail }} style={styles.thumbnail} />
            <LinearGradient
              colors={['transparent', 'rgba(10, 28, 60, 0.9)']}
              style={styles.thumbnailOverlay}
            />
            
            {/* Level badge with gradient */}
            <LinearGradient
              colors={DIFFICULTY_COLORS[quiz.difficulty] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelBadge}
            >
              <Text style={styles.levelText}>Lv {quiz.level}</Text>
            </LinearGradient>

            {/* Completion status indicator */}
            {quiz.completed && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#00f2fe" />
              </View>
            )}
          </View>

          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Quiz title */}
            <Text style={styles.quizTitle} numberOfLines={2}>
              {quiz.title}
            </Text>

            {/* Quiz description */}
            <Text style={styles.quizDescription} numberOfLines={2}>
              {quiz.description}
            </Text>

            {/* Bottom info row */}
            <View style={styles.infoRow}>
              {/* Category tag */}
              <View style={styles.categoryTag}>
                <Ionicons name="pricetag" size={12} color="#4facfe" />
                <Text style={styles.categoryText}>{quiz.category}</Text>
              </View>

              {/* Stars display */}
              <View style={styles.starsContainer}>
                {[...Array(3)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < quiz.stars ? 'star' : 'star-outline'}
                    size={14}
                    color={i < quiz.stars ? '#fee140' : '#4a5568'}
                  />
                ))}
              </View>
            </View>

            {/* Questions count */}
            <View style={styles.questionsRow}>
              <Ionicons name="help-circle-outline" size={14} color="#667eea" />
              <Text style={styles.questionsText}>
                {quiz.totalQuestions} questions
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Explore Feed component
export default function ExploreFeed() {
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Animate header on mount
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  // Section header component
  const renderHeader = () => (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Main title with gradient icon */}
      <View style={styles.titleRow}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name="rocket" size={32} color="#ffffff" />
        </LinearGradient>
        <View style={styles.titleTextContainer}>
          <Text style={styles.mainTitle}>Explore Quizzes</Text>
          <Text style={styles.subtitle}>
            Embark on your learning journey
          </Text>
        </View>
      </View>

      {/* Stats row with glassmorphic cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={20} color="#fee140" />
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={20} color="#f5576c" />
          <Text style={styles.statNumber}>7</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={20} color="#4facfe" />
          <Text style={styles.statNumber}>840</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Space-themed gradient background */}
      <LinearGradient
        colors={['#0A0E27', '#1a1f3a', '#2d3561']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      {/* Animated stars background */}
      <View style={styles.starsBackground}>
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
              },
            ]}
          />
        ))}
      </View>

      {/* Quiz cards list with pull-to-refresh */}
      <FlatList
        data={MOCK_QUIZZES}
        renderItem={({ item, index }) => (
          <QuizCard quiz={item} index={index} />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4facfe"
            colors={['#4facfe', '#667eea']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container with space background
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  starsBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },

  // List content padding
  listContent: {
    padding: 16,
    paddingTop: 60,
  },

  // Header section styles
  headerContainer: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  titleTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },

  // Stats row with glassmorphic cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },

  // Quiz card styles
  cardContainer: {
    width: CARD_WIDTH,
    padding: 6,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Thumbnail section
  thumbnailContainer: {
    height: 140,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  // Level badge with gradient
  levelBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Completion badge
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(10, 28, 60, 0.8)',
    borderRadius: 12,
    padding: 4,
  },

  // Card content section
  cardContent: {
    padding: 12,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 20,
  },
  quizDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    lineHeight: 16,
  },

  // Info row with category and stars
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#4facfe',
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },

  // Questions count row
  questionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});