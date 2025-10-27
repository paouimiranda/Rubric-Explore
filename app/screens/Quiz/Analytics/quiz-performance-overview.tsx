// File: app/analytics/quiz-performance-overview.tsx
import BottomNavigation from '@/components/Interface/nav-bar';
import { QuizService, type QuizAttempt } from '@/services/quiz-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const { width: screenWidth } = Dimensions.get('window');

type FilterOption = 'last5' | 'last10' | 'all';

interface QuizSummary {
  quizId: string;
  quizTitle: string;
  attempts: QuizAttempt[];
  averageScore: number;
  bestScore: number;
  lastAttemptDate: Date;
  totalAttempts: number;
}

const QuizPerformanceOverview = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizSummaries, setQuizSummaries] = useState<QuizSummary[]>([]);
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    loadQuizSummaries();
  }, []);

  const loadQuizSummaries = async () => {
    try {
      setLoading(true);
      const attemptsMap = await QuizService.getAttemptsGroupedByQuiz();
      
      const summaries: QuizSummary[] = [];
      attemptsMap.forEach((attempts, quizId) => {
        if (attempts.length > 0) {
          const scores = attempts.map(a => a.percentage);
          const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const bestScore = Math.max(...scores);
          
          summaries.push({
            quizId,
            quizTitle: attempts[0].quizTitle,
            attempts,
            averageScore,
            bestScore,
            lastAttemptDate: attempts[0].completedAt,
            totalAttempts: attempts.length,
          });
        }
      });
      
      // Sort by last attempt date (most recent first)
      summaries.sort((a, b) => b.lastAttemptDate.getTime() - a.lastAttemptDate.getTime());
      
      setQuizSummaries(summaries);
    } catch (error) {
      console.error('Error loading quiz summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuizSummaries();
    setRefreshing(false);
  };

  const getFilteredSummaries = () => {
    switch (filter) {
      case 'last5':
        return quizSummaries.slice(0, 5);
      case 'last10':
        return quizSummaries.slice(0, 10);
      case 'all':
      default:
        return quizSummaries;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderSparkline = (attempts: QuizAttempt[]) => {
    if (attempts.length < 2) return null;
    
    // Get last 5 attempts for sparkline
    const recentAttempts = attempts.slice(0, 5).reverse();
    const data = recentAttempts.map((attempt, index) => ({
      value: attempt.percentage,
      dataPointText: '',
    }));

    return (
      <View style={styles.sparklineContainer}>
        <LineChart
          data={data}
          width={100}
          height={40}
          hideDataPoints={false}
          dataPointsRadius={3}
          dataPointsColor="#63DC9A"
          color="#63DC9A"
          thickness={2}
          hideRules
          hideYAxisText
          hideAxesAndRules
          curved
          areaChart
          startFillColor="rgba(99, 220, 154, 0.3)"
          endFillColor="rgba(99, 220, 154, 0.05)"
          startOpacity={0.9}
          endOpacity={0.1}
        />
      </View>
    );
  };

  const renderQuizCard = (summary: QuizSummary) => {
    const scoreColor = 
      summary.averageScore >= 80 ? '#63DC9A' :
      summary.averageScore >= 60 ? '#F2CD41' :
      '#EE007F';

    return (
      <TouchableOpacity
        key={summary.quizId}
        style={styles.quizCard}
        onPress={() => router.push(`./quiz-performance-detail?quizId=${summary.quizId}`)}
        activeOpacity={0.8}
      >
        <View style={styles.quizCardHeader}>
          <View style={styles.quizCardTitleContainer}>
            <Text style={styles.quizCardTitle} numberOfLines={1}>
              {summary.quizTitle}
            </Text>
            <Text style={styles.quizCardAttempts}>
              {summary.totalAttempts} attempt{summary.totalAttempts !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </View>

        <View style={styles.quizCardContent}>
          <View style={styles.quizCardStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: scoreColor }]}>
                {summary.averageScore.toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Score</Text>
              <Text style={[styles.statValue, { color: '#63DC9A' }]}>
                {summary.bestScore.toFixed(0)}%
              </Text>
            </View>

            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Last Played</Text>
              <Text style={styles.statDate}>
                {formatDate(summary.lastAttemptDate)}
              </Text>
            </View>
          </View>

          {renderSparkline(summary.attempts)}
        </View>

        <View style={styles.quizCardFooter}>
          <View style={styles.trendIndicator}>
            {summary.attempts.length >= 2 && (
              <>
                {summary.attempts[0].percentage > summary.attempts[1].percentage ? (
                  <>
                    <Ionicons name="trending-up" size={16} color="#63DC9A" />
                    <Text style={[styles.trendText, { color: '#63DC9A' }]}>Improving</Text>
                  </>
                ) : summary.attempts[0].percentage < summary.attempts[1].percentage ? (
                  <>
                    <Ionicons name="trending-down" size={16} color="#EE007F" />
                    <Text style={[styles.trendText, { color: '#EE007F' }]}>Declining</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="remove" size={16} color="#F2CD41" />
                    <Text style={[styles.trendText, { color: '#F2CD41' }]}>Stable</Text>
                  </>
                )}
              </>
            )}
          </View>
          
          <Text style={styles.viewAnalyticsText}>View Analytics</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bar-chart-outline" size={64} color="#64748b" />
      <Text style={styles.emptyTitle}>No Quiz History Yet</Text>
      <Text style={styles.emptyText}>
        Take some quizzes to see your performance analytics here!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient 
        colors={['#0f2c45ff','#324762']} 
        start={{x: 0, y: 0}} 
        end={{ x: 0, y: 1 }} 
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <LottieView
              source={require('@/assets/animations/quiz-loading.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient 
      colors={['#0f2c45ff','#324762']} 
      start={{x: 0, y: 0}} 
      end={{ x: 0, y: 1 }} 
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Performance</Text>
            <Text style={styles.headerSubtitle}>Track your quiz progress</Text>
          </View>
        </View>

        {/* Filter Pills */}
        {quizSummaries.length > 0 && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterPill, filter === 'last5' && styles.filterPillActive]}
              onPress={() => setFilter('last5')}
            >
              <Text style={[styles.filterText, filter === 'last5' && styles.filterTextActive]}>
                Last 5
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterPill, filter === 'last10' && styles.filterPillActive]}
              onPress={() => setFilter('last10')}
            >
              <Text style={[styles.filterText, filter === 'last10' && styles.filterTextActive]}>
                Last 10
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All Time
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quiz List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#63DC9A"
              colors={['#63DC9A']}
            />
          }
        >
          {quizSummaries.length === 0 ? (
            renderEmptyState()
          ) : (
            getFilteredSummaries().map(renderQuizCard)
          )}
        </ScrollView>
        
        <BottomNavigation/>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterPillActive: {
    backgroundColor: '#568CD2',
    borderColor: '#568CD2',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quizCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quizCardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  quizCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  quizCardAttempts: {
    fontSize: 12,
    color: '#94a3b8',
  },
  quizCardContent: {
    marginBottom: 12,
  },
  quizCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statDate: {
    fontSize: 12,
    color: '#F2CD41',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  sparklineContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  quizCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAnalyticsText: {
    fontSize: 14,
    color: '#568CD2',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },
  lottieAnimation: {
    width: 100,
    height: 100,
    marginBottom: 3,
  },
});

export default QuizPerformanceOverview;