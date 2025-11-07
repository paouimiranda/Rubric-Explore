// File: screens/Explore/leaderboard-tab.tsx
import { getAvatarUrl } from '@/constants/avatars';
import { auth, db } from '@/firebase';
import { getUserFriends, User } from '@/services/friends-service';
import { JourneyService, UserProgress, UserStats } from '@/services/journey-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface LeaderboardUser extends User {
  stats: {
    totalStars: number;
    totalShards: number;
    currentLevel: number;
    experience: number;
    perfectScores: number;
    totalQuizzesTaken: number;
  };
  rank: number;
  isCurrentUser: boolean;
  avatarIndex?: number;
}

type SortByType = 'stars' | 'shards' | 'level' | 'xp';

const AVATAR_COLORS = [
  ['#667eea', '#764ba2'], // Purple
  ['#f093fb', '#f5576c'], // Pink
  ['#4facfe', '#00f2fe'], // Blue
  ['#43e97b', '#38f9d7'], // Green
  ['#fa709a', '#fee140'], // Orange
  ['#30cfd0', '#330867'], // Deep Blue
  ['#a8edea', '#fed6e3'], // Pastel
  ['#ff9a9e', '#fecfef'], // Rose
  ['#ffecd2', '#fcb69f'], // Peach
  ['#ff6e7f', '#bfe9ff'], // Coral
];

const RANK_GRADIENTS = {
  1: ['#FFD700', '#FFA500'],
  2: ['#C0C0C0', '#808080'],
  3: ['#CD7F32', '#8B4513'],
};

// Stat Badge Component
const StatBadge = ({ icon, value, label, color }: any) => (
  <View style={styles.statBadge}>
    <Ionicons name={icon} size={14} color={color} style={styles.statIcon} />
    <View>
      <Text style={styles.statBadgeValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  </View>
);

// Leaderboard Item Component
const LeaderboardItem = ({ item, index, isTopThree }: any) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const avatarGradient = AVATAR_COLORS[(item.avatarIndex || 0) % AVATAR_COLORS.length];

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 40,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const rankGradient = RANK_GRADIENTS[item.rank as keyof typeof RANK_GRADIENTS];

  return (
    <Animated.View
      style={[
        styles.leaderboardItem,
        { transform: [{ scale: scaleAnim }] },
        isTopThree && styles.topThreeItem,
      ]}
    >
      <LinearGradient
        colors={item.isCurrentUser 
          ? ['rgba(102, 126, 234, 0.25)', 'rgba(118, 75, 162, 0.25)']
          : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
        style={[
          styles.itemGradient,
          item.isCurrentUser && styles.currentUserHighlight,
          isTopThree && styles.topThreeGradient,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* User Avatar & Info */}
        <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
            <Image
                source={{ uri: getAvatarUrl(item.avatarIndex || 0) }}
                style={styles.avatar}
            />
            {/* Rank Badge on Avatar */}
            {rankGradient ? (
                <LinearGradient
                colors={rankGradient as any}
                style={styles.rankBadgeOnAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                >
                <Text style={styles.rankBadgeText}>{item.rank}</Text>
                </LinearGradient>
            ) : (
                <View style={styles.rankBadgeOnAvatarDefault}>
                <Text style={styles.rankBadgeTextDefault}>{item.rank}</Text>
                </View>
            )}
            </View>
          
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.isCurrentUser ? 'You' : item.displayName}
              </Text>
              {item.isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={styles.userLevel}>Level {item.stats.currentLevel}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBadge 
            icon="star" 
            value={item.stats.totalStars} 
            label="Stars"
            color="#FFD700"
          />
          <StatBadge 
            icon="diamond" 
            value={item.stats.totalShards} 
            label="Shards"
            color="#4facfe"
          />
          <StatBadge 
            icon="flash" 
            value={item.stats.experience} 
            label="XP"
            color="#43e97b"
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const LeaderboardTab = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [sortBy, setSortBy] = useState<SortByType>('stars');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLeaderboard();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    sortLeaderboard(sortBy);
  }, [sortBy]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const friends = await getUserFriends(currentUserId);
      const currentUserStats = await JourneyService.getUserStats();
      const currentUserProgress = await JourneyService.getUserProgress();
      const currentUserDoc = auth.currentUser;

      const usersWithStats: LeaderboardUser[] = [];

      if (currentUserDoc) {
        const currentUserDocData = await getDoc(doc(db, 'users', currentUserId));
        const userData = currentUserDocData.exists() ? currentUserDocData.data() : null;
        
        usersWithStats.push({
          uid: currentUserId,
          firstName: currentUserDoc.displayName?.split(' ')[0] || 'You',
          lastName: currentUserDoc.displayName?.split(' ')[1] || '',
          email: currentUserDoc.email || '',
          username: currentUserDoc.email?.split('@')[0] || 'you',
          displayName: currentUserDoc.displayName || 'You',
          avatarId: 1,
          avatarIndex: userData?.avatarIndex || 0,
          bio: '',
          followers: 0,
          following: 0,
          posts: 0,
          friends: friends.length,
          isVerified: false,
          isActive: true,
          createdAt: null as any,
          updatedAt: null as any,
          stats: {
            totalStars: currentUserProgress.totalStars,
            totalShards: currentUserStats.shards,
            currentLevel: currentUserProgress.currentLevel,
            experience: currentUserStats.experience.totalXP,
            perfectScores: currentUserStats.lifetimeStats.perfectScores,
            totalQuizzesTaken: currentUserStats.lifetimeStats.totalQuizzesTaken,
          },
          rank: 0,
          isCurrentUser: true,
        });
      }

      for (const friend of friends) {
        try {
          const statsDoc = await getDoc(doc(db, 'userStats', friend.uid));
          const progressDoc = await getDoc(doc(db, 'userProgress', friend.uid));
          
          if (statsDoc.exists() && progressDoc.exists()) {
            const friendStats = statsDoc.data() as UserStats;
            const friendProgress = progressDoc.data() as UserProgress;
            
            usersWithStats.push({
              ...friend,
              stats: {
                totalStars: friendProgress.totalStars,
                totalShards: friendStats.shards,
                currentLevel: friendProgress.currentLevel,
                experience: friendStats.experience.totalXP,
                perfectScores: friendStats.lifetimeStats.perfectScores,
                totalQuizzesTaken: friendStats.lifetimeStats.totalQuizzesTaken,
              },
              rank: 0,
              isCurrentUser: false,
            });
          } else {
            usersWithStats.push({
              ...friend,
              stats: {
                totalStars: 0,
                totalShards: 0,
                currentLevel: 1,
                experience: 0,
                perfectScores: 0,
                totalQuizzesTaken: 0,
              },
              rank: 0,
              isCurrentUser: false,
            });
          }
        } catch (error) {
          console.log('Error fetching friend stats:', friend.uid, error);
          usersWithStats.push({
            ...friend,
            stats: {
              totalStars: 0,
              totalShards: 0,
              currentLevel: 1,
              experience: 0,
              perfectScores: 0,
              totalQuizzesTaken: 0,
            },
            rank: 0,
            isCurrentUser: false,
          });
        }
      }

      setLeaderboardData(usersWithStats);
      sortLeaderboard(sortBy, usersWithStats);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortLeaderboard = (type: SortByType, data?: LeaderboardUser[]) => {
    const dataToSort = data || [...leaderboardData];
    
    const sortedData = dataToSort.sort((a, b) => {
      switch (type) {
        case 'stars':
          return b.stats.totalStars - a.stats.totalStars;
        case 'shards':
          return b.stats.totalShards - a.stats.totalShards;
        case 'level':
          return b.stats.currentLevel - a.stats.currentLevel;
        case 'xp':
          return b.stats.experience - a.stats.experience;
        default:
          return 0;
      }
    }).map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    setLeaderboardData(sortedData);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
    return (
      <LeaderboardItem
        item={item}
        index={index}
        isTopThree={item.rank <= 3}
      />
    );
  };

  const renderHeader = () => {
    const currentUser = leaderboardData.find(u => u.isCurrentUser);
    
    return (
      <View style={styles.headerContainer}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Ionicons name="trophy" size={28} color="#FFD700" />
            <Text style={styles.title}>Leaderboard</Text>
          </View>
          <Text style={styles.subtitle}>
            Compete with {leaderboardData.length - 1} {leaderboardData.length === 2 ? 'friend' : 'friends'}
          </Text>
        </View>

        {/* Current User Summary Card */}
        {currentUser && (
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
            style={styles.summaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Your Position</Text>
              <View style={styles.rankIndicator}>
                <Text style={styles.rankIndicatorText}>#{currentUser.rank}</Text>
              </View>
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.summaryStatValue}>{currentUser.stats.totalStars}</Text>
                <Text style={styles.summaryStatLabel}>Stars</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatItem}>
                <Ionicons name="diamond" size={18} color="#4facfe" />
                <Text style={styles.summaryStatValue}>{currentUser.stats.totalShards}</Text>
                <Text style={styles.summaryStatLabel}>Shards</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatItem}>
                <Ionicons name="flash" size={18} color="#43e97b" />
                <Text style={styles.summaryStatValue}>{currentUser.stats.experience}</Text>
                <Text style={styles.summaryStatLabel}>XP</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by</Text>
          <View style={styles.sortButtons}>
            {(['stars', 'shards', 'level', 'xp'] as SortByType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSortBy(type)}
                activeOpacity={0.7}
                style={styles.sortButton}
              >
                {sortBy === type ? (
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.sortButtonActive}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.sortButtonTextActive}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.sortButtonInactive}>
                    <Text style={styles.sortButtonTextInactive}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.rankingsTitle}>Rankings</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#555" />
      <Text style={styles.emptyTitle}>No Friends Yet</Text>
      <Text style={styles.emptyText}>
        Add friends to see how you rank against them!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <FlatList
        data={leaderboardData}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#667eea"
            colors={['#667eea']}
          />
        }
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    color: '#aaa',
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleSection: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#aaa',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  rankIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankIndicatorText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryStatValue: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  summaryStatLabel: {
    fontFamily: 'Montserrat',
    fontSize: 11,
    color: '#aaa',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sortContainer: {
    marginBottom: 20,
  },
  sortLabel: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
  },
  sortButtonActive: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sortButtonInactive: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  sortButtonTextActive: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sortButtonTextInactive: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  rankingsTitle: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  leaderboardItem: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  topThreeItem: {
    marginBottom: 12,
  },
  itemGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  topThreeGradient: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  currentUserHighlight: {
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.6)',
  },
  rankSection: {
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  rankBadgeOnAvatar: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  rankBadgeOnAvatarDefault: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontFamily: 'Montserrat',
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  youBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  youBadgeText: {
    fontFamily: 'Montserrat',
    fontSize: 9,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.5,
  },
  userLevel: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    color: '#aaa',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIcon: {
    opacity: 0.9,
  },
  statBadgeValue: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statBadgeLabel: {
    fontFamily: 'Montserrat',
    fontSize: 9,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  rankBadgeText: {
  fontFamily: 'Montserrat',
  fontSize: 11,
  fontWeight: '700',
  color: '#fff',
},
rankBadgeTextDefault: {
  fontFamily: 'Montserrat',
  fontSize: 11,
  fontWeight: '700',
  color: '#ccc',
},
userSection: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},
});

export default LeaderboardTab;