// Updated friends.tsx with CustomAlertModal

import ChatList from '@/components/Interface/chat-list';
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import FriendCard from '@/components/Interface/friend-card';
import BottomNavigation from '@/components/Interface/nav-bar';
import { getTotalUnreadCount } from '@/services/chat-service';
import {
  acceptFriendRequest,
  getFriendRequests,
  getUserFriends,
  listenToFriendRequests,
  rejectFriendRequest,
  SearchUser,
  searchUsers,
  sendFriendRequest,
  FriendRequest as ServiceFriendRequest,
  User,
} from '@/services/friends-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
type Status = 'online' | 'busy' | 'offline';

interface Friend extends User {
  status?: Status;
}

interface FriendRequest extends ServiceFriendRequest {}

interface SearchResult extends SearchUser {}

export default function Friendlist() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Custom Alert Modal state
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

  // Helper function to show custom alert
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
      const userFriends = await getUserFriends(currentUser.uid);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
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

  const loadFriendRequests = async () => {
    if (!currentUser) return;
    
    try {
      const requests = await getFriendRequests(currentUser.uid);
      setFriendRequests(requests);
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
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      showAlert(
        'error',
        'Search Error',
        'Failed to search users. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string, username: string) => {
    if (!currentUser) return;
    
    try {
      await sendFriendRequest(currentUser.uid, userId);
      showAlert(
        'success',
        'Request Sent',
        `Friend request sent to ${username}`,
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
      setSearchResults(prev => prev.filter(user => user.uid !== userId));
    } catch (error) {
      showAlert(
        'error',
        'Error',
        'Failed to send friend request. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
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
    } catch (error) {
      showAlert(
        'error',
        'Error',
        'Failed to accept friend request. Please try again.',
        [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
      );
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
            } catch (error) {
              showAlert(
                'error',
                'Error',
                'Failed to reject friend request. Please try again.',
                [{ text: 'OK', style: 'primary', onPress: () => closeAlert() }]
              );
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

  const navigateToSearch = () => {
    router.push('./search-screen/');
  };

  const navigateToProfile = (userId: string) => {
    router.push({
      pathname: '/screens/User/profile',
      params: { userId }
    });
    console.log('pressed!');
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
    if (!search.trim()) return friends;
    
    return friends.filter(friend =>
      friend.displayName.toLowerCase().includes(search.toLowerCase()) ||
      friend.username.toLowerCase().includes(search.toLowerCase())
    );
  };

  const onlineCount = friends.filter(friend => friend.isOnline).length;

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
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
          >
            {search.trim() ? (
              searchLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Searching users...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <View style={styles.resultsContainer}>
                  <View style={styles.resultsHeader}>
                    <Ionicons name="search" size={16} color="#9ca3af" />
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
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyCircle}>
                    <Ionicons name="people-outline" size={48} color="#4b5563" />
                  </View>
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>Try searching with a different name</Text>
                </View>
              )
            ) : (
              loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : getFilteredFriends().length > 0 ? (
                getFilteredFriends().map((friend) => (
                  <FriendCard 
                    key={friend.uid} 
                    name={friend.displayName} 
                    username={friend.username}
                    status={friend.isOnline ? 'online' : 'offline'}
                    onChatPress={() => startChatWithFriend(friend)}
                    onProfilePress={() => navigateToProfile(friend.uid)}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyCircle}>
                    <Ionicons name="people-outline" size={48} color="#4b5563" />
                  </View>
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
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
          >
            {friendRequests.length > 0 ? (
              <>
                <View style={styles.requestsHeader}>
                  <Ionicons name="person-add" size={16} color="#9ca3af" />
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
                <View style={styles.emptyCircle}>
                  <Ionicons name="mail-outline" size={48} color="#4b5563" />
                </View>
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
      colors={['#324762', '#0A1C3C']}
      start={{ x: 1, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Social</Text>
          <View style={styles.headerStats}>
            <Ionicons name="people" size={16} color="#3b82f6" />
            <Text style={styles.headerStatsText}>{friends.length} friends</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
              onPress={() => setActiveTab('friends')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'friends' ? 'people' : 'people-outline'} 
                size={18} 
                color={activeTab === 'friends' ? '#fff' : '#94A3B8'} 
              />
              <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                Friends
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
              onPress={() => setActiveTab('requests')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'requests' ? 'person-add' : 'person-add-outline'} 
                size={18} 
                color={activeTab === 'requests' ? '#fff' : '#94A3B8'} 
              />
              <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                Requests
              </Text>
              {friendRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{friendRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
              onPress={() => {
                setActiveTab('chat');
                loadUnreadCount();
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'} 
                size={18} 
                color={activeTab === 'chat' ? '#fff' : '#94A3B8'} 
              />
              <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
                Chat
              </Text>
              {unreadChatCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadChatCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Friends Tab Actions */}
        {activeTab === 'friends' && (
          <View style={styles.actionsContainer}>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{onlineCount} online</Text>
            </View>
            
            {/* <TouchableOpacity style={styles.findFriendsBtn} onPress={navigateToSearch}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.findFriendsBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.findFriendsText}>Find Friends</Text>
              </LinearGradient>
            </TouchableOpacity> */}
          </View>
        )}

        {/* Search Bar */}
        {(activeTab === 'friends' || activeTab === 'requests') && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder={
                activeTab === 'friends' 
                  ? "Search friends or find new users..." 
                  : "Search requests..."
              }
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        {renderTabContent()}
        
        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
        
        <BottomNavigation />
      </SafeAreaView>
    </LinearGradient>
  );
}

// Search Result Card Component
const SearchResultCard = ({ user, onSendRequest, onViewProfile }: { 
  user: SearchResult; 
  onSendRequest: (userId: string, username: string) => void;
  onViewProfile: () => void;
}) => (
  <TouchableOpacity 
    style={styles.searchResultCard}
    onPress={onViewProfile}
    activeOpacity={0.7}
  >
    <View style={styles.searchResultLeft}>
      <View style={styles.searchResultAvatar}>
        <Text style={styles.searchResultAvatarText}>
          {user.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{user.displayName}</Text>
        <Text style={styles.searchResultUsername}>@{user.username}</Text>
      </View>
    </View>
    <TouchableOpacity 
      style={styles.addButton}
      onPress={(e) => {
        e.stopPropagation();
        onSendRequest(user.uid, user.username);
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.addButtonGradient}
      >
        <Ionicons name="person-add" size={16} color="#fff" />
        <Text style={styles.addButtonText}>Add</Text>
      </LinearGradient>
    </TouchableOpacity>
  </TouchableOpacity>
);

// Friend Request Card Component
const FriendRequestCard = ({ request, onAccept, onReject, onViewProfile }: {
  request: FriendRequest;
  onAccept: (request: FriendRequest) => void;
  onReject: (request: FriendRequest) => void;
  onViewProfile: () => void;
}) => (
  <View style={styles.requestCard}>
    <TouchableOpacity 
      style={styles.requestLeft}
      onPress={onViewProfile}
      activeOpacity={0.7}
    >
      <View style={styles.requestAvatar}>
        <Text style={styles.requestAvatarText}>
          {request.senderInfo.displayName.charAt(0).toUpperCase()}
        </Text>
        <View style={styles.requestBadge}>
          <Ionicons name="person-add" size={10} color="#3b82f6" />
        </View>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.senderInfo.displayName}</Text>
        <Text style={styles.requestUsername}>@{request.senderInfo.username}</Text>
      </View>
    </TouchableOpacity>
    <View style={styles.requestActions}>
      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => onAccept(request)}
        activeOpacity={0.7}
      >
        <Ionicons name="checkmark" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.rejectButton}
        onPress={() => onReject(request)}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerStatsText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  onlineText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },
  findFriendsBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  findFriendsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  findFriendsText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  scrollArea: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(75, 85, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
  },
  resultsHeaderText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  searchResultUsername: {
    color: '#94A3B8',
    fontSize: 13,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
  },
  requestsHeaderText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  requestAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  requestBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(31, 41, 55, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  requestUsername: {
    color: '#94A3B8',
    fontSize: 13,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});