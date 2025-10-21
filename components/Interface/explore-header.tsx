import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ExploreHeaderProps {
  points?: number;
  energy?: number;
  maxEnergy?: number;
  streak?: number;
  level?: number;
}

const ExploreHeader: React.FC<ExploreHeaderProps> = ({
  points = 1250,
  energy = 4,
  maxEnergy = 5,
  streak = 7,
  level = 12,
}) => {
  const renderEnergyHearts = () => {
    return Array.from({ length: maxEnergy }, (_, index) => (
      <Text key={index} style={[
        styles.heart,
        index < energy ? styles.fullHeart : styles.emptyHeart
      ]}>
        {index < energy ? '❤️' : '🤍'}
      </Text>
    ));
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {/* Left side - Points */}
        <View style={styles.statContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>💎</Text>
            <Text style={styles.statValue}>{points.toLocaleString()}</Text>
          </View>
        </View>

        {/* Center - Energy */}
        <View style={styles.energyContainer}>
          <View style={styles.statBox}>
            <View style={styles.heartsContainer}>
              {renderEnergyHearts()}
            
            <Text style={styles.statValue}>{energy}/{maxEnergy}</Text>
            </View>
          </View>
        </View>

        {/* Right side - Streak & Level */}
        
          
          {/* Level */}
          <View style={[styles.statBox, styles.statBox]}>
            <Text style={styles.smallStatIcon}>⭐</Text>
            <Text style={styles.statValue}>{level}</Text>
        </View>
      </View>
      
      {/* Progress bar for next level (optional) */}
     
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0b002dff',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContainer: {
    flex: 1,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 30,
  },
  smallStatBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  statIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  smallStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  smallStatValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  energyContainer: {
    flex: 1,
    alignItems: 'center',
  },
  energyBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heartsContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  heart: {
    fontSize: 16,
    marginHorizontal: 1,
  },
  fullHeart: {
    opacity: 1,
  },
  emptyHeart: {
    opacity: 0.4,
  },
  energyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rightStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '70%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default ExploreHeader;