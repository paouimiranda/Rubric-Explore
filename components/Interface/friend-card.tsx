// components/Interface/friend-card.tsx (Updated with Profile Navigation)
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FriendCardProps {
  name: string;
  status: 'online' | 'offline' | 'busy';
  onChatPress?: () => void;
  username?: string;
  onProfilePress?: () => void;
}

export default function FriendCard({ name, status, onChatPress, username, onProfilePress }: FriendCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#22C55E';
      case 'busy':
        return '#EF4444';
      case 'offline':
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'busy':
        return 'Busy';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return 'checkmark-circle';
      case 'busy':
        return 'remove-circle';
      case 'offline':
      default:
        return 'ellipse';
    }
  };

  // Generate a consistent color based on the name
  const getAvatarGradient = () => {
    const firstChar = name.charCodeAt(0);
    const gradients = [
      ['#3b82f6', '#2563eb'], // Blue
      ['#8b5cf6', '#6366f1'], // Purple
      ['#ec4899', '#d946ef'], // Pink
      ['#f59e0b', '#f97316'], // Orange
      ['#10b981', '#059669'], // Green
      ['#06b6d4', '#0891b2'], // Cyan
    ];
    return gradients[firstChar % gradients.length];
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onProfilePress}
      activeOpacity={0.7}
      disabled={!onProfilePress}
    >
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={getAvatarGradient()} 
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
            <View style={styles.statusPulse} />
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {username && (
            <Text style={styles.username} numberOfLines={1}>@{username}</Text>
          )}
          <View style={styles.statusRow}>
            <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {onChatPress && (
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={(e) => {
              e.stopPropagation();
              onChatPress();
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.15)']}
              style={styles.chatButtonGradient}
            >
              <Ionicons name="chatbubble" size={18} color="#3b82f6" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={(e) => {
            e.stopPropagation();
            // Add more options menu here if needed
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(31, 41, 55, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'inherit',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  username: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
});