// File: app/analytics/quiz-detail.tsx
import { QuizService, type QuizAttempt, type TopicPerformance } from '@/services/quiz-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 80;

type ChartFilter = '5' | '10' | 'all';

const QuizPerformanceDetail = () => {
  const router = useRouter();
  const { quizId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([]);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');

  useEffect(() => {
    if (quizId && typeof quizId === 'string') {
      loadQuizAnalytics(quizId);
    }
  }, [quizId]);

  const loadQuizAnalytics = async (id: string) => {
    try {
      setLoading(true);
      const quizAttempts = await QuizService.getUserQuizAttempts(id);
      setAttempts(quizAttempts);
      
      if (quizAttempts.length > 0) {
        const topics = QuizService.getPerformanceByTopic(quizAttempts);
        setTopicPerformance(topics);
      }
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAttempts = () => {
    switch (chartFilter) {
      case '5':
        return attempts.slice(0, 5);
      case '10':
        return attempts.slice(0, 10);
      case 'all':
      default:
        return attempts;
    }
  };

  const getSummaryStats = () => {
    if (attempts.length === 0) {
      return {
        bestScore: 0,
        worstScore: 0,
        averageScore: 0,
        totalTime: 0,
        averageTime: 0,
      };
    }

    const scores = attempts.map(a => a.percentage);
    const times = attempts.map(a => a.timeSpent);
    
    return {
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    };
  };

  const getWeakestAndStrongestTopics = () => {
    if (topicPerformance.length === 0) {
      return { weakest: null, strongest: null };
    }

    const sorted = [...topicPerformance].sort((a, b) => a.accuracy - b.accuracy);
    return {
      weakest: sorted[0],
      strongest: sorted[sorted.length - 1],
    };
  };

  const renderScoreTrendChart = () => {
    const filteredAttempts = getFilteredAttempts();
    if (filteredAttempts.length === 0) return null;

    const scoreTrends = QuizService.getScoreTrends(filteredAttempts);
    const data = scoreTrends.map((trend, index) => ({
      value: trend.percentage,
      label: `${trend.attemptNumber}`,
      dataPointText: `${trend.percentage}%`,
      dataPointLabelComponent: () => null,
    }));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Score Progress</Text>
          <View style={styles.chartFilterPills}>
            <TouchableOpacity
              style={[styles.chartFilterPill, chartFilter === '5' && styles.chartFilterPillActive]}
              onPress={() => setChartFilter('5')}
            >
              <Text style={[styles.chartFilterText, chartFilter === '5' && styles.chartFilterTextActive]}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartFilterPill, chartFilter === '10' && styles.chartFilterPillActive]}
              onPress={() => setChartFilter('10')}
            >
              <Text style={[styles.chartFilterText, chartFilter === '10' && styles.chartFilterTextActive]}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartFilterPill, chartFilter === 'all' && styles.chartFilterPillActive]}
              onPress={() => setChartFilter('all')}
            >
              <Text style={[styles.chartFilterText, chartFilter === 'all' && styles.chartFilterTextActive]}>All</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.chartWrapper}>
          <LineChart
            data={data}
            width={CHART_WIDTH}
            height={200}
            maxValue={100}
            noOfSections={5}
            spacing={data.length > 5 ? CHART_WIDTH / (data.length + 1) : 60}
            color="#63DC9A"
            thickness={3}
            dataPointsColor="#63DC9A"
            dataPointsRadius={5}
            curved
            areaChart
            startFillColor="rgba(99, 220, 154, 0.4)"
            endFillColor="rgba(99, 220, 154, 0.05)"
            startOpacity={0.9}
            endOpacity={0.1}
            rulesColor="rgba(255, 255, 255, 0.1)"
            rulesType="solid"
            xAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisTextStyle={styles.chartAxisText}
            xAxisLabelTextStyle={styles.chartAxisText}
            
          />
        </View>
        <Text style={styles.chartXLabel}>Attempt Number</Text>
      </View>
    );
  };

  const renderTopicAccuracyChart = () => {
    if (topicPerformance.length === 0) return null;

    const data = topicPerformance.map(topic => {
      const isWeak = topic.accuracy < 70;
      return {
        value: topic.accuracy,
        label: topic.topic.length > 10 ? topic.topic.substring(0, 10) + '...' : topic.topic,
        frontColor: isWeak ? '#EE007F' : topic.accuracy >= 85 ? '#63DC9A' : '#F2CD41',
        topLabelComponent: () => (
          <Text style={styles.barTopLabel}>{topic.accuracy.toFixed(0)}%</Text>
        ),
      };
    });

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Performance By Tags</Text>
        <View style={styles.chartWrapper}>
          <BarChart
            data={data}
            width={CHART_WIDTH}
            height={200}
            barWidth={40}
            spacing={20}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={1}
            yAxisThickness={1}
            xAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisTextStyle={styles.chartAxisText}
            xAxisLabelTextStyle={styles.chartAxisText}
            noOfSections={5}
            maxValue={100}
            isAnimated
            animationDuration={800}
          />
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#63DC9A' }]} />
            <Text style={styles.legendText}>Strong (85%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F2CD41' }]} />
            <Text style={styles.legendText}>Average (70-84%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EE007F' }]} />
            <Text style={styles.legendText}>Weak (&lt;70%)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderResponseTimeChart = () => {
    const filteredAttempts = getFilteredAttempts();
    if (filteredAttempts.length === 0) return null;

    const timingTrends = QuizService.getTimingTrends(filteredAttempts);
    const data = timingTrends.map(trend => ({
      value: trend.avgTimePerQuestion,
      label: `${trend.attemptNumber}`,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Average Response Time</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={data}
            width={CHART_WIDTH}
            height={180}
            spacing={data.length > 5 ? CHART_WIDTH / (data.length + 1) : 60}
            color="#568CD2"
            thickness={3}
            dataPointsColor="#568CD2"
            dataPointsRadius={5}
            curved
            areaChart
            startFillColor="rgba(86, 140, 210, 0.4)"
            endFillColor="rgba(86, 140, 210, 0.05)"
            startOpacity={0.9}
            endOpacity={0.1}
            rulesColor="rgba(255, 255, 255, 0.1)"
            rulesType="solid"
            xAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisColor="rgba(255, 255, 255, 0.2)"
            yAxisTextStyle={styles.chartAxisText}
            xAxisLabelTextStyle={styles.chartAxisText}
            
          />
        </View>
        <Text style={styles.chartXLabel}>Attempt Number (seconds per question)</Text>
      </View>
    );
  };

  const renderSummaryCards = () => {
    const stats = getSummaryStats();
    const { weakest, strongest } = getWeakestAndStrongestTopics();

    return (
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(99, 220, 154, 0.15)' }]}>
          <Ionicons name="trophy" size={24} color="#63DC9A" />
          <Text style={styles.summaryCardValue}>{stats.bestScore.toFixed(0)}%</Text>
          <Text style={styles.summaryCardLabel}>Best Score</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: 'rgba(238, 0, 127, 0.15)' }]}>
          <Ionicons name="arrow-down" size={24} color="#EE007F" />
          <Text style={styles.summaryCardValue}>{stats.worstScore.toFixed(0)}%</Text>
          <Text style={styles.summaryCardLabel}>Lowest Score</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: 'rgba(242, 205, 65, 0.15)' }]}>
          <Ionicons name="analytics" size={24} color="#F2CD41" />
          <Text style={styles.summaryCardValue}>{stats.averageScore.toFixed(0)}%</Text>
          <Text style={styles.summaryCardLabel}>Average Score</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: 'rgba(86, 140, 210, 0.15)' }]}>
          <Ionicons name="time" size={24} color="#568CD2" />
          <Text style={styles.summaryCardValue}>
            {Math.floor(stats.averageTime / 60)}:{(stats.averageTime % 60).toFixed(0).padStart(2, '0')}
          </Text>
          <Text style={styles.summaryCardLabel}>Avg Time</Text>
        </View>
      </View>
    );
  };

  const renderTopicInsights = () => {
    const { weakest, strongest } = getWeakestAndStrongestTopics();
    
    if (!weakest || !strongest) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Performance Insights</Text>
        
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="alert-circle" size={20} color="#EE007F" />
            <Text style={styles.insightLabel}>Needs Improvement</Text>
          </View>
          <Text style={styles.insightTopic}>{weakest.topic}</Text>
          <View style={styles.insightStats}>
            <Text style={styles.insightStat}>
              {weakest.correct}/{weakest.total} correct ({weakest.accuracy.toFixed(0)}%)
            </Text>
            <Text style={styles.insightStat}>
              Avg time: {weakest.avgTime.toFixed(1)}s
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#63DC9A" />
            <Text style={styles.insightLabel}>Strongest Area</Text>
          </View>
          <Text style={styles.insightTopic}>{strongest.topic}</Text>
          <View style={styles.insightStats}>
            <Text style={styles.insightStat}>
              {strongest.correct}/{strongest.total} correct ({strongest.accuracy.toFixed(0)}%)
            </Text>
            <Text style={styles.insightStat}>
              Avg time: {strongest.avgTime.toFixed(1)}s
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
            <ActivityIndicator size="large" color="#63DC9A" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (attempts.length === 0) {
    return (
      <LinearGradient 
        colors={['#0f2c45ff','#324762']} 
        start={{x: 0, y: 0}} 
        end={{ x: 0, y: 1 }} 
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quiz Analytics</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={64} color="#64748b" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Complete this quiz to see detailed analytics!
            </Text>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {attempts[0]?.quizTitle || 'Quiz Analytics'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Cards */}
          {renderSummaryCards()}

          {/* Score Trend Chart */}
          {renderScoreTrendChart()}

          {/* Topic Accuracy Chart */}
          {renderTopicAccuracyChart()}

          {/* Response Time Chart */}
          {renderResponseTimeChart()}

          {/* Topic Insights */}
          {renderTopicInsights()}
        </ScrollView>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: (screenWidth - 52) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  chartFilterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  chartFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  chartFilterPillActive: {
    backgroundColor: '#E77F00',
    borderColor: '#E77F00',
  },
  chartFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  chartFilterTextActive: {
    color: '#ffffff',
  },
  chartWrapper: {
  alignItems: 'center',
  paddingVertical: 8,
  overflow: 'hidden', // Prevent overflow
  width: '100%', // Constrain to container width
},
  chartAxisText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  chartXLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  barTopLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  insightTopic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  insightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightStat: {
    fontSize: 12,
    color: '#94a3b8',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
});

export default QuizPerformanceDetail;