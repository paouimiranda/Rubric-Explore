// components/Interface/friend-card.tsx (Fixed Presence Integration)
import { getAvatarUrl } from '@/constants/avatars';
import { getTheme } from '@/constants/friend-card-themes';
import { PresenceData, presenceService } from '@/services/presence-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ThemeAnimations from './theme-animations';

interface FriendCardProps {
  name: string;
  userId: string;
  onChatPress?: () => void;
  username?: string;
  onProfilePress?: () => void;
  onMenuPress?: () => void;
  isMuted?: boolean;
  isPinned?: boolean;
  themeId?: string;
  avatarIndex?: number;
}

export default function FriendCard({ 
  name,
  userId,
  onChatPress, 
  username, 
  onProfilePress, 
  onMenuPress,
  isMuted = false,
  isPinned = false,
  themeId = 'default',
  avatarIndex = 0,
}: FriendCardProps) {
  const theme = getTheme(themeId);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const statusPulseAnim = useRef(new Animated.Value(1)).current;
  const [isMounted, setIsMounted] = useState(false);
  
  // Presence state
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Subscribe to user's presence with proper cleanup
  useEffect(() => {
    console.log(`🔔 Setting up presence listener for ${name} (${userId})`);
    
    const unsubscribe = presenceService.getUserPresence(userId, (presenceData) => {
      console.log(`📊 ${name} presence update:`, presenceData?.status || 'null');
      setPresence(presenceData);
      setIsOnline(presenceService.isUserOnline(presenceData));
    });

    // Also fetch initial presence immediately
    presenceService.getUserPresenceOnce(userId).then((initialPresence) => {
      console.log(`📍 ${name} initial presence:`, initialPresence?.status || 'null');
      if (initialPresence) {
        setPresence(initialPresence);
        setIsOnline(presenceService.isUserOnline(initialPresence));
      }
    });

    return () => {
      console.log(`🔕 Cleaning up presence listener for ${name} (${userId})`);
      unsubscribe();
    };
  }, [userId, name]);

  // Theme animations
  useEffect(() => {
    if (theme.animated && isMounted) {
      if (theme.animationType === 'glow' || theme.borderGlow) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      if (theme.animationType === 'pulse') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
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
    }
  }, [theme.animated, theme.animationType, theme.borderGlow, isMounted, glowAnim, pulseAnim]);

  // Status pulse animation for online users
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(statusPulseAnim, {
            toValue: 1.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(statusPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      statusPulseAnim.setValue(1);
    }
  }, [isOnline, statusPulseAnim]);

  const getStatusColor = () => {
    if (!presence) return '#6B7280'; // Gray if no presence data

    switch (presence.status) {
      case 'online':
        return '#22C55E'; // Green
      case 'away':
        return '#F59E0B'; // Yellow/Orange
      case 'offline':
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = () => {
    if (!presence) return 'Offline';

    switch (presence.status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return presenceService.getLastSeenText(presence);
      default:
        return 'Offline';
    }
  };

  const getStatusIcon = () => {
    if (!presence) return 'ellipse';

    switch (presence.status) {
      case 'online':
        return 'checkmark-circle';
      case 'away':
        return 'time-outline';
      case 'offline':
      default:
        return 'ellipse';
    }
  };

  const getAvatarGradient = () => {
    const firstChar = name.charCodeAt(0);
    const gradients = [
      ['#3b82f6', '#2563eb'],
      ['#8b5cf6', '#6366f1'],
      ['#ec4899', '#d946ef'],
      ['#f59e0b', '#f97316'],
      ['#10b981', '#059669'],
      ['#06b6d4', '#0891b2'],
    ] as const;
    return gradients[firstChar % gradients.length];
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundColor || 'rgba(31, 41, 55, 0.2)',
      borderWidth: theme.borderWidth || 1,
      borderColor: theme.borderColor || 'rgba(75, 85, 99, 0.3)',
    },
    theme.shadowColor && {
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  ];

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const pulseOpacity = statusPulseAnim.interpolate({
    inputRange: [1, 1.8],
    outputRange: [0.6, 0],
  });

  const avatarUrl = getAvatarUrl(avatarIndex);

  return (
    <View style={styles.cardWrapper}>
      {/* Background gradient layer */}
      {theme.gradientColors && (
        <LinearGradient
          colors={theme.gradientColors as any}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Theme animations */}
      {theme.animated && (
        <ThemeAnimations 
          theme={theme}
          containerStyle={{ borderRadius: 16 }}
        />
      )}

      {/* Glow effect layer */}
      {theme.borderGlow && theme.glowColor && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 16,
              borderWidth: theme.borderWidth || 2,
              borderColor: theme.glowColor,
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      {/* Main card content */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity 
          style={cardStyle}
          onPress={onProfilePress}
          activeOpacity={0.7}
          disabled={!onProfilePress}
        >
          <View style={styles.leftSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={getAvatarGradient()} 
                style={styles.avatarBorder}
              >
                <View style={styles.avatarImageWrapper}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
              </LinearGradient>
              
              {/* Status indicator with pulse animation */}
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                {isOnline && (
                  <Animated.View 
                    style={[
                      styles.statusPulse,
                      { 
                        backgroundColor: getStatusColor(),
                        opacity: pulseOpacity,
                        transform: [{ scale: statusPulseAnim }]
                      }
                    ]} 
                  />
                )}
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
                onMenuPress && onMenuPress();  
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Indicators */}
      {isMuted && (
        <View style={styles.muteIndicator}>
          <Ionicons name="volume-mute" size={14} color="#f59e0b" />
        </View>
      )}
      
      {isPinned && (
        <View style={styles.pinIndicator}>
          <Ionicons name="pin" size={14} color="#10b981" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
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
  avatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  muteIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  pinIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
});