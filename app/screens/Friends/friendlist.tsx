// Enhanced friendlist.tsx with Theme Support, Avatars, and Real-time Presence

import { useNotifications } from '@/app/contexts/NotificationContext';
import ChatList from '@/components/Interface/chat-list';
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import FriendCard from '@/components/Interface/friend-card';
import BottomNavigation from '@/components/Interface/nav-bar';
import { getAvatarUrl } from '@/constants/avatars';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { getTotalUnreadCount } from '@/services/chat-service';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendRequests, // NEW: For cancelling requests
  getOutgoingFriendRequests,
  getUserFriends,
  getUserPreferences,
  listenToFriendRequests, // NEW: For loading sent requests
  rejectFriendRequest,
  removeFriend,
  SearchUser,
  searchUsers,
  sendFriendRequest,
  FriendRequest as ServiceFriendRequest,
  toggleMuteFriend,
  togglePinFriend,
  User,
} from '@/services/friends-service';
import { presenceService } from '@/services/presence-service';
import { clearUserThemeCache, getUserThemesBatch } from '@/services/theme-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../../firebase';

type TabType = 'friends' | 'requests' | 'chat';

interface Friend extends User {
  themeId?: string;
  avatarIndex?: number;
}

interface FriendRequest extends ServiceFriendRequest {}
interface SearchResult extends SearchUser {
  avatarIndex?: number;
}

export default function Friendlist() {
  const router = useRouter();
  const lottieRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { addBacklogEvent } = useBacklogLogger();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { muteFriend, unmuteFriend, isFriendMuted } = useNotifications();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set()); // NEW: Track sent friend requests
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [mutedFriends, setMutedFriends] = useState<Set<string>>(new Set());
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());
  const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState(false); // NEW: Track if a request is being sent/cancelled
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'warning';
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const currentUser = auth.currentUser;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!currentUser) return;
      try {
        const prefs = await getUserPreferences(currentUser.uid);
        prefs.mutedFriends.forEach(friendId => muteFriend(friendId));
        setPinnedFriends(new Set(prefs.pinnedFriends));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, [currentUser, muteFriend]);

  // NEW: Subscribe to all friends' presence
  useEffect(() => {
    if (friends.length === 0) return;

    const unsubscribers: (() => void)[] = [];
    const onlineSet = new Set<string>();

    // Subscribe to each friend's presence
    friends.forEach((friend) => {
      const unsubscribe = presenceService.getUserPresence(friend.uid, (presence) => {
        const isOnline = presenceService.isUserOnline(presence);
        
        if (isOnline) {
          onlineSet.add(friend.uid);
        } else {
          onlineSet.delete(friend.uid);
        }
        
        // Update state with a new Set to trigger re-render
        setOnlineFriends(new Set(onlineSet));
      });
      
      unsubscribers.push(unsubscribe);
    });

    // Cleanup subscriptions when friends change
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [friends]);

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (currentUser) {
      loadFriends();
      loadFriendRequests();
      loadUnreadCount();
      
      const unsubscribe = listenToFriendRequests(currentUser.uid, (requests) => {
        setFriendRequests(requests);
      });
      
      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'friends' && search.trim()) {
      handleSearch(search);
    } else {
      setSearchResults([]);
    }
  }, [search, activeTab]);

  useEffect(() => {
    if (activeTab === 'friends' && friends.length > 0) {
      reloadThemesForFriends();
    }
  }, [activeTab]);

  const openMenu = (friend: Friend) => {
    setSelectedFriend(friend);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedFriend(null);
  };

  const reloadThemesForFriends = async () => {
    if (friends.length === 0) return;
    
    try {
      const friendIds = friends.map(f => f.uid);
      const themeMap = await getUserThemesBatch(friendIds);
      
      setFriends(prevFriends => 
        prevFriends.map(friend => ({
          ...friend,
          themeId: themeMap.get(friend.uid) || 'default'
        }))
      );
      
      console.log('✅ Themes reloaded successfully:', Object.fromEntries(themeMap));
    } catch (error) {
      console.error('❌ Error reloading themes:', error);
    }
  };

  const handleUnfriend = async (friend: Friend) => {
    if (!currentUser) return;
    showAlert(
      'warning',
      'Unfriend',
      `Are you sure you want to unfriend ${friend.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: closeMenu },
        {
          text: 'Unfriend',
          style: 'primary',
          onPress: async () => {
            closeMenu();
            const originalFriends = [...friends];
            const originalMuted = new Set(mutedFriends);
            const originalPinned = new Set(pinnedFriends);
            
            try {
              setFriends(prev => prev.filter(f => f.uid !== friend.uid));
              setMutedFriends(prev => {
                const newSet = new Set(prev);
                newSet.delete(friend.uid);
                return newSet;
              });
              setPinnedFriends(prev => {
                const newSet = new Set(prev);
                newSet.delete(friend.uid);
                return newSet;
              });
              
              await Promise.all([
                toggleMuteFriend(currentUser.uid, friend.uid, true),
                togglePinFriend(currentUser.uid, friend.uid, true),
                removeFriend(currentUser.uid, friend.uid),
              ]);
              
              clearUserThemeCache(friend.uid);
              
              showAlert(
                'success',
                'Unfriended',
                `${friend.displayName} has been removed from your friends.`,
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
            } catch (error) {
              setFriends(originalFriends);
              setMutedFriends(originalMuted);
              setPinnedFriends(originalPinned);
              
              showAlert(
                'error',
                'Error',
                'Failed to unfriend. Please try again.',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
              addBacklogEvent("unfriend_error", { friendUsername: friend.username, error: String(error) });
            }
          },
        },
      ]
    );
  };

  const handleMute = async (friend: Friend) => {
    if (!currentUser) return;
    const isCurrentlyMuted = isFriendMuted(friend.uid);
    try {
      if (isCurrentlyMuted) {
        unmuteFriend(friend.uid);
        showAlert('success', 'Unmuted', `${friend.displayName} notifications are now enabled.`, [{ text: 'OK', onPress: closeAlert }]);
      } else {
        muteFriend(friend.uid);
        showAlert('success', 'Muted', `${friend.displayName} notifications are now muted.`, [{ text: 'OK', onPress: closeAlert }]);
      }
      
      await toggleMuteFriend(currentUser.uid, friend.uid, isCurrentlyMuted);
    } catch (error) {
      if (isCurrentlyMuted) {
        muteFriend(friend.uid);
      } else {
        unmuteFriend(friend.uid);
      }
      showAlert('error', 'Error', 'Failed to update mute status. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
      console.error('Error in handleMute:', error);
    }
    closeMenu();
  };

  const handlePin = async (friend: Friend) => {
    if (!currentUser) return;
    const isCurrentlyPinned = pinnedFriends.has(friend.uid);
    try {
      const newPinned = new Set(pinnedFriends);
      if (isCurrentlyPinned) {
        newPinned.delete(friend.uid);
        showAlert('success', 'Unpinned', `${friend.displayName} is no longer pinned.`, [{ text: 'OK', onPress: closeAlert }]);
      } else {
        newPinned.add(friend.uid);
        showAlert('success', 'Pinned', `${friend.displayName} is now pinned to the top.`, [{ text: 'OK', onPress: closeAlert }]);
      }
      setPinnedFriends(newPinned);

      await togglePinFriend(currentUser.uid, friend.uid, isCurrentlyPinned);
    } catch (error) {
      setPinnedFriends(new Set(pinnedFriends));
      showAlert('error', 'Error', 'Failed to update pin status. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
      console.error('Error in handlePin:', error);
    }
    closeMenu();
  };

  const loadUnreadCount = async () => {
    if (!currentUser) return;
    
    try {
      const count = await getTotalUnreadCount(currentUser.uid);
      setUnreadChatCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadFriends = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading friends...');
      
      const userFriends = await getUserFriends(currentUser.uid);
      console.log(`✅ Loaded ${userFriends.length} friends`);
      
      const friendIds = userFriends.map(f => f.uid);
      console.log('🎨 Fetching themes for:', friendIds);
      
      const themeMap = await getUserThemesBatch(friendIds);
      console.log('✅ Themes fetched:', Object.fromEntries(themeMap));
      
      const friendsWithThemes = userFriends.map(friend => {
        const themeId = themeMap.get(friend.uid) || 'default';
        console.log(`👤 ${friend.displayName}: theme = ${themeId}, avatar = ${friend.avatarIndex || 0}`);
        return {
          ...friend,
          themeId,
          avatarIndex: friend.avatarIndex ?? 0
        };
      });
      
      setFriends(friendsWithThemes);
      console.log('✅ Friends with themes and avatars set in state');
    } catch (error) {
      console.error('❌ Error loading friends:', error);
      showAlert(
        'error',
        'Error',
        'Failed to load friends. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Now also loads outgoing requests to populate sentRequests
  const loadFriendRequests = async () => {
    if (!currentUser) return;
    
    try {
      const requests = await getFriendRequests(currentUser.uid); // Incoming
      setFriendRequests(requests);
      
      // NEW: Load outgoing requests to populate sentRequests
      const outgoing = await getOutgoingFriendRequests(currentUser.uid);
      setSentRequests(new Set(outgoing.map(req => req.toUserId)));
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    if (!currentUser || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      const results = await searchUsers(searchTerm, currentUser.uid);
      const filteredResults = results.filter(user => !friends.some(friend => friend.uid === user.uid));
      setSearchResults(filteredResults);
      addBacklogEvent(BACKLOG_EVENTS.USER_SEARCHED_USERS, { searchTerm });
    } catch (error) {
      console.error('Error searching users:', error);
      showAlert(
        'error',
        'Search Error',
        'Failed to search users. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      addBacklogEvent("user_search_error", { searchTerm, error: String(error) });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string, username: string) => {
  if (!currentUser || sendingRequest) return; // NEW: Early return if already sending
  
  setSendingRequest(true); // NEW: Start loading
  try {
    if (friends.some(friend => friend.uid === userId)) {
      showAlert(
        'warning',
        'Already Friends',
        `${username} is already your friend.`,
        [{ text: 'OK', onPress: () => closeAlert() }]
      );
      return;
    }
    
    const isAlreadySent = sentRequests.has(userId);
    if (isAlreadySent) {
      // Cancel the request
      await cancelFriendRequest(currentUser.uid, userId);
      setSentRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      showAlert(
        'success',
        'Request Cancelled',
        `Friend request to ${username} has been cancelled.`,
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
    } else {
      // Send the request
      await sendFriendRequest(currentUser.uid, userId);
      setSentRequests(prev => new Set(prev).add(userId));
      showAlert(
        'success',
        'Request Sent',
        `Friend request sent to ${username}`,
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      addBacklogEvent(BACKLOG_EVENTS.USER_SENT_FRIEND_REQUEST, { recipientUsername: username });
    }
  } catch (error) {
    showAlert(
      'error',
      'Error',
      'Failed to send friend request. Please try again.',
      [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
    );
    addBacklogEvent("friend_request_send_error", { recipientUsername: username, error: String(error) });
  } finally {
    setSendingRequest(false); // NEW: Always reset loading state
  }
};



  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request.id, request.fromUserId, request.toUserId);
      showAlert(
        'success',
        'Friend Added',
        `You and ${request.senderInfo.displayName} are now friends!`,
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      loadFriends();
      addBacklogEvent(BACKLOG_EVENTS.USER_ACCEPTED_FRIEND_REQUEST, { senderUsername: request.senderInfo.username });
    } catch (error) {
      showAlert(
        'error',
        'Error',
        'Failed to accept friend request. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      addBacklogEvent("friend_request_accept_error", { senderUsername: request.senderInfo.username, error: String(error) });
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    showAlert(
      'warning',
      'Reject Request',
      `Are you sure you want to reject the friend request from ${request.senderInfo.displayName}?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => closeAlert()
        },
        {
          text: 'Reject',
          style: 'primary',
          onPress: async () => {
            closeAlert();
            try {
              await rejectFriendRequest(request.id, request.toUserId);
              showAlert(
                'success',
                'Request Rejected',
                'Friend request has been rejected.',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
              addBacklogEvent(BACKLOG_EVENTS.USER_REJECTED_FRIEND_REQUEST, { senderUsername: request.senderInfo.username });
            } catch (error) {
              showAlert(
                'error',
                'Error',
                'Failed to reject friend request. Please try again.',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
              addBacklogEvent("friend_request_reject_error", { senderUsername: request.senderInfo.username, error: String(error) });
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'friends') {
      await loadFriends();
    } else if (activeTab === 'requests') {
      await loadFriendRequests();
    } else if (activeTab === 'chat') {
      await loadUnreadCount();
    }
    setRefreshing(false);
  };

  const navigateToProfile = (userId: string) => {
    router.push({
      pathname: '/screens/User/profile',
      params: { userId }
    });
  };

  const startChatWithFriend = async (friend: Friend) => {
    if (!currentUser) return;
    
    router.push({
      pathname: './chat-screen',
      params: {
        otherUserId: friend.uid,
        otherUserName: friend.displayName
      }
    });
  };

  const getFilteredFriends = () => {
    if (!search.trim()) {
      return [...friends].sort((a, b) => {
        const aPinned = pinnedFriends.has(a.uid);
        const bPinned = pinnedFriends.has(b.uid);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      });
    }
    return friends.filter(friend =>
      friend.displayName.toLowerCase().includes(search.toLowerCase()) ||
      friend.username.toLowerCase().includes(search.toLowerCase())
    );
  };

  // UPDATED: Use real presence data for online count
  const onlineCount = onlineFriends.size;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <ScrollView 
            contentContainerStyle={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#4facfe"
                colors={["#4facfe"]}
              />
            }
          >
            {search.trim() ? (
              searchLoading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.lottieContainer}>
                    <LottieView
                      ref={lottieRef}
                      source={require('@/assets/animations/quiz-loading.json')}
                      autoPlay
                      loop
                      style={styles.lottieAnimation}
                    />
                  </View>
                  <Text style={styles.loadingText}>Searching users...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <View style={styles.resultsContainer}>
                  <View style={styles.resultsHeader}>
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.resultsHeaderIconBg}
                    >
                      <Ionicons name="search" size={14} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.resultsHeaderText}>
                      {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                    </Text>
                  </View>
                  {searchResults.map((user) => (
                    <SearchResultCard 
                      key={user.uid}
                      user={user}
                      onSendRequest={handleSendFriendRequest}
                      onViewProfile={() => navigateToProfile(user.uid)}
                      isRequestSent={sentRequests.has(user.uid)} // NEW: Pass sent state
                      isSending={sendingRequest}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconBg}
                  >
                    <Ionicons name="search-outline" size={48} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>Try searching with a different name</Text>
                </View>
              )
            ) : (
              loading ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.lottieContainer}>
                    <LottieView
                      ref={lottieRef}
                      source={require('@/assets/animations/quiz-loading.json')}
                      autoPlay
                      loop
                      style={styles.lottieAnimation}
                    />
                  </View>
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : getFilteredFriends().length > 0 ? (
                getFilteredFriends().map((friend) => {
                  console.log(`🎨 Rendering friend ${friend.displayName} with theme: ${friend.themeId || 'undefined'}, avatar: ${friend.avatarIndex ?? 0}`);
                  return (
                    <FriendCard 
                      key={friend.uid}
                      userId={friend.uid}
                      name={friend.displayName} 
                      username={friend.username}
                      onChatPress={() => startChatWithFriend(friend)}
                      onProfilePress={() => navigateToProfile(friend.uid)}
                      onMenuPress={() => openMenu(friend)}
                      isMuted={isFriendMuted(friend.uid)}
                      isPinned={pinnedFriends.has(friend.uid)}
                      themeId={friend.themeId || 'default'}
                      avatarIndex={friend.avatarIndex ?? 0}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconBg}
                  >
                    <Ionicons name="people-outline" size={48} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.emptyText}>No friends yet</Text>
                  <Text style={styles.emptySubtext}>Add friends to start connecting</Text>
                </View>
              )
            )}
          </ScrollView>
        );

      case 'requests':
        return (
          <ScrollView 
            contentContainerStyle={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#4facfe"
                colors={["#4facfe"]}
              />
            }
          >
            {friendRequests.length > 0 ? (
              <>
                <View style={styles.requestsHeader}>
                  <LinearGradient
                    colors={['#fa709a', '#fee140']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.requestsHeaderIconBg}
                  >
                    <Ionicons name="person-add" size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.requestsHeaderText}>
                    {friendRequests.length} pending {friendRequests.length === 1 ? 'request' : 'requests'}
                  </Text>
                </View>
                {friendRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    onViewProfile={() => navigateToProfile(request.fromUserId)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyIconBg}
                >
                  <Ionicons name="mail-outline" size={48} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyText}>No friend requests</Text>
                <Text style={styles.emptySubtext}>You're all caught up!</Text>
              </View>
            )}
          </ScrollView>
        );

      case 'chat':
        return (
          <ChatList 
            refreshing={refreshing} 
            onRefresh={onRefresh}
          />
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#0A1C3C', '#1a2942', '#324762']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Social Hub</Text>
              <View style={styles.headerSubtitleRow}>
                <Ionicons name="people" size={14} color="#4facfe" />
                <Text style={styles.headerSubtitle}>{friends.length} connections</Text>
              </View>
            </View>
            <LinearGradient
              colors={['rgba(79, 172, 254, 0.15)', 'rgba(0, 242, 254, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerStatsBg}
            >
              <View style={styles.headerStatsInner}>
                <Ionicons name="chatbubbles" size={18} color="#4facfe" />
                <Text style={styles.headerStatsText}>{friends.length}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.tabsGradient}
            >
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab]}
                  onPress={() => setActiveTab('friends')}
                  activeOpacity={0.8}
                >
                  {activeTab === 'friends' && (
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <View style={styles.tabContent}>
                    <Ionicons 
                      name={activeTab === 'friends' ? 'people' : 'people-outline'} 
                      size={20} 
                      color={activeTab === 'friends' ? '#fff' : '#94A3B8'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                      Friends
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab]}
                  onPress={() => setActiveTab('requests')}
                  activeOpacity={0.8}
                >
                  {activeTab === 'requests' && (
                    <LinearGradient
                      colors={['#fa709a', '#fee140']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <View style={styles.tabContent}>
                    <Ionicons 
                      name={activeTab === 'requests' ? 'person-add' : 'person-add-outline'} 
                      size={20} 
                      color={activeTab === 'requests' ? '#fff' : '#94A3B8'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                      Requests
                    </Text>
                    {friendRequests.length > 0 && (
                      <LinearGradient
                        colors={['#ef4444', '#dc2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badge}
                      >
                        <Text style={styles.badgeText}>{friendRequests.length}</Text>
                      </LinearGradient>
                    )}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab]}
                  onPress={() => {
                    setActiveTab('chat');
                    loadUnreadCount();
                  }}
                  activeOpacity={0.8}
                >
                  {activeTab === 'chat' && (
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <View style={styles.tabContent}>
                    <Ionicons 
                      name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'} 
                      size={20} 
                      color={activeTab === 'chat' ? '#fff' : '#94A3B8'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
                      Chat
                    </Text>
                    {unreadChatCount > 0 && (
                      <LinearGradient
                        colors={['#ef4444', '#dc2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badge}
                      >
                        <Text style={styles.badgeText}>{unreadChatCount}</Text>
                      </LinearGradient>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Online Indicator for Friends Tab */}
          {activeTab === 'friends' && (
            <View style={styles.actionsContainer}>
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.onlineIndicatorBg}
              >
                <View style={styles.onlineIndicatorInner}>
                  <View style={styles.onlineDotOuter}>
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={styles.onlineText}>{onlineCount} online now</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Search Bar */}
          {(activeTab === 'friends' || activeTab === 'requests') && (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.searchContainerGradient}
            >
              <View style={styles.searchContainer}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.searchIconBg}
                >
                  <Ionicons name="search" size={16} color="#fff" />
                </LinearGradient>
                <TextInput
                  style={styles.searchBar}
                  placeholder={
                    activeTab === 'friends' 
                      ? "Search friends or discover users..." 
                      : "Search pending requests..."
                  }
                  placeholderTextColor="#64748b"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={20} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          )}

          {/* Content */}
          {renderTabContent()}
        </Animated.View>
        
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
        
        {/* Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity style={styles.menuOverlay} onPress={closeMenu} activeOpacity={1}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuOption} onPress={() => selectedFriend && handleUnfriend(selectedFriend)}>
                <Ionicons name="person-remove" size={20} color="#ef4444" />
                <Text style={styles.menuOptionText}>Unfriend</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => selectedFriend && handleMute(selectedFriend)}>
                <Ionicons name={isFriendMuted(selectedFriend?.uid || '') ? "volume-high" : "volume-mute"} size={20} color="#f59e0b" />
                <Text style={styles.menuOptionText}>{isFriendMuted(selectedFriend?.uid || '') ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => selectedFriend && handlePin(selectedFriend)}>
                <Ionicons name={pinnedFriends.has(selectedFriend?.uid || '') ? "pin-outline" : "pin"} size={20} color="#10b981" />
                <Text style={styles.menuOptionText}>{pinnedFriends.has(selectedFriend?.uid || '') ? 'Unpin' : 'Pin'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        <BottomNavigation />
      </SafeAreaView>
    </LinearGradient>
  );
}

// Search Result Card Component
// UPDATED: SearchResultCard with sent state
const SearchResultCard = ({ user, onSendRequest, onViewProfile, isRequestSent, isSending }: { 
  user: SearchResult; 
  onSendRequest: (userId: string, username: string) => void;
  onViewProfile: () => void;
  isRequestSent: boolean;
  isSending: boolean; // NEW: Prop for loading state
}) => {
  const avatarUrl = getAvatarUrl(user.avatarIndex ?? 0);
  
  return (
    <TouchableOpacity 
      style={styles.cardWrapper}
      onPress={onViewProfile}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.searchResultCard}
      >
        <View style={styles.searchResultLeft}>
          <View style={styles.searchResultAvatarWrapper}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.searchResultAvatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.searchResultInfo}>
            <Text style={styles.searchResultName}>{user.displayName}</Text>
            <Text style={styles.searchResultUsername}>@{user.username}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, (isRequestSent || isSending) && styles.sentButton]} // NEW: Apply sentButton style during sending too
          onPress={(e) => {
            e.stopPropagation();
            if (!isSending) onSendRequest(user.uid, user.username); // NEW: Only call if not sending
          }}
          activeOpacity={0.8}
          disabled={isSending} // NEW: Disable only during sending
        >
          <LinearGradient
            colors={isSending ? ['#6b7280', '#4b5563'] : (isRequestSent ? ['#6b7280', '#4b5563'] : ['#4facfe', '#00f2fe'])} // NEW: Grey during sending
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            <Ionicons 
              name={isSending ? "sync" : (isRequestSent ? "checkmark" : "person-add")} // NEW: Spinner icon during sending
              size={16} 
              color="#fff" 
            />
            <Text style={styles.addButtonText}>
              {isSending ? 'Sending...' : (isRequestSent ? 'Sent' : 'Add')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};



// Friend Request Card Component
const FriendRequestCard = ({ request, onAccept, onReject, onViewProfile }: {
  request: FriendRequest;
  onAccept: (request: FriendRequest) => void;
  onReject: (request: FriendRequest) => void;
  onViewProfile: () => void;
}) => {
  const avatarUrl = getAvatarUrl(request.senderInfo.avatarIndex ?? 0);
  
  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.requestCard}
      >
        <TouchableOpacity 
          style={styles.requestLeft}
          onPress={onViewProfile}
          activeOpacity={0.8}
        >
          <View style={styles.requestAvatarWrapper}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.requestAvatar}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['#fa709a', '#fee140']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.requestBadge}
            >
              <Ionicons name="person-add" size={10} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{request.senderInfo.displayName}</Text>
            <Text style={styles.requestUsername}>@{request.senderInfo.username}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAccept(request)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptButton}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onReject(request)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rejectButton}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  headerStatsBg: {
    borderRadius: 16,
    padding: 1,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerStatsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 28, 60, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 15,
    gap: 8,
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tabsContainer: {
    marginBottom: 20,
  },
  tabsGradient: {
    borderRadius: 18,
    padding: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 28, 60, 0.6)',
    borderRadius: 17,
    padding: 5,
  },
  tab: {
    flex: 1,
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  activeTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  onlineIndicatorBg: {
    borderRadius: 14,
    padding: 1,
    alignSelf: 'flex-start',
  },
  onlineIndicatorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 28, 60, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    gap: 10,
  },
  onlineDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainerGradient: {
    borderRadius: 16,
    padding: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 28, 60, 0.6)',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  scrollArea: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  lottieContainer: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 15,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  resultsHeaderIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeaderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  searchResultAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  searchResultAvatar: {
    width: '100%',
    height: '100%',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 3,
  },
  searchResultUsername: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  requestsHeaderIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsHeaderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(250, 112, 154, 0.2)',
    shadowColor: '#fa709a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  requestAvatarWrapper: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  requestAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  requestBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(10, 28, 60, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fa709a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 3,
  },
  requestUsername: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'rgba(10, 28, 60, 0.9)',
    borderRadius: 12,
    padding: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
    sentButton: { // NEW: Style for sent button (greyed out)
    opacity: 0.6,
  },
});