// Updated friends.tsx - replace the chat tab section and import ChatList

import ChatList from '@/components/Interface/chat-list';
import FriendCard from '@/components/Interface/friend-card';
import BottomNavigation from '@/components/Interface/nav-bar';
import { getTotalUnreadCount } from '@/services/chat-service'; // Add this import
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// Use the service types directly
interface Friend extends User {
  status?: Status;
}

// Use the service FriendRequest type
interface FriendRequest extends ServiceFriendRequest {
  // Can extend if needed
}

// Use the service SearchUser type
interface SearchResult extends SearchUser {
  // Additional search-specific fields if needed
}

const router = useRouter();

export default function Friendlist() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0); // Add this state

  const currentUser = auth.currentUser;

  // Load friends on component mount
  useEffect(() => {
    if (currentUser) {
      loadFriends();
      loadFriendRequests();
      loadUnreadCount(); // Add this
      
      // Set up real-time listener for friend requests
      const unsubscribe = listenToFriendRequests(currentUser.uid, (requests) => {
        setFriendRequests(requests);
      });
      
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Handle search
  useEffect(() => {
    if (activeTab === 'friends' && search.trim()) {
      handleSearch(search);
    } else {
      setSearchResults([]);
    }
  }, [search, activeTab]);

  // Load unread chat count
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
      Alert.alert('Error', 'Failed to load friends');
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
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string, username: string) => {
    if (!currentUser) return;
    
    try {
      await sendFriendRequest(currentUser.uid, userId);
      Alert.alert('Success', `Friend request sent to ${username}`);
      // Remove from search results or update UI state
      setSearchResults(prev => prev.filter(user => user.uid !== userId));
    } catch (error) {
      Alert.alert('Error');
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request.id, request.fromUserId, request.toUserId);
      Alert.alert('Success', 'Friend request accepted');
      loadFriends(); // Refresh friends list
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    try {
      await rejectFriendRequest(request.id, request.toUserId);
      Alert.alert('Success', 'Friend request rejected');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'friends') {
      await loadFriends();
    } else if (activeTab === 'requests') {
      await loadFriendRequests();
    } else if (activeTab === 'chat') {
      await loadUnreadCount(); // Refresh unread count
    }
    setRefreshing(false);
  };

  const navigateToSearch = () => {
    router.push('./search-screen/');
  };

  // Add function to start chat with a friend
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {search.trim() ? (
              // Show search results when searching
              searchLoading ? (
                <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <SearchResultCard 
                    key={user.uid}
                    user={user}
                    onSendRequest={handleSendFriendRequest}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No users found</Text>
              )
            ) : (
              // Show friends list when not searching
              loading ? (
                <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
              ) : getFilteredFriends().length > 0 ? (
                getFilteredFriends().map((friend) => (
                  <FriendCard 
                    key={friend.uid} 
                    name={friend.displayName} 
                    status={friend.isOnline ? 'online' : 'offline'}
                    onChatPress={() => startChatWithFriend(friend)} // Add chat functionality
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No friends yet</Text>
              )
            )}
          </ScrollView>
        );

      case 'requests':
        return (
          <ScrollView 
            contentContainerStyle={styles.scrollArea}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No friend requests</Text>
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
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              FRIENDS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              REQUEST {friendRequests.length > 0 && `(${friendRequests.length})`}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
            onPress={() => {
              setActiveTab('chat');
              loadUnreadCount(); // Refresh unread count when opening chat tab
            }}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
              CHAT {unreadChatCount > 0 && `(${unreadChatCount})`}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'friends' && (
          <>
            <Text style={styles.online}>ONLINE: {onlineCount}</Text>
            
            <TouchableOpacity style={styles.inviteBtn} onPress={navigateToSearch}>
              <Text style={styles.inviteText}>FIND FRIENDS</Text>
            </TouchableOpacity>
          </>
        )}

        {(activeTab === 'friends' || activeTab === 'requests') && (
          <TextInput
            style={styles.searchBar}
            placeholder={
              activeTab === 'friends' 
                ? "Search friends or find new users..." 
                : "Search requests..."
            }
            placeholderTextColor="#CBD5E1"
            value={search}
            onChangeText={setSearch}
          />
        )}

        {renderTabContent()}
        <BottomNavigation />
      </SafeAreaView>
    </LinearGradient>
  );
}

// Search Result Card Component
const SearchResultCard = ({ user, onSendRequest }: { 
  user: SearchResult; 
  onSendRequest: (userId: string, username: string) => void;
}) => (
  <View style={styles.searchResultCard}>
    <View style={styles.searchResultInfo}>
      <Text style={styles.searchResultName}>{user.displayName}</Text>
      <Text style={styles.searchResultUsername}>@{user.username}</Text>
    </View>
    <TouchableOpacity 
      style={styles.addButton}
      onPress={() => onSendRequest(user.uid, user.username)}
    >
      <Text style={styles.addButtonText}>Add</Text>
    </TouchableOpacity>
  </View>
);

// Friend Request Card Component
const FriendRequestCard = ({ request, onAccept, onReject }: {
  request: FriendRequest;
  onAccept: (request: FriendRequest) => void;
  onReject: (request: FriendRequest) => void;
}) => (
  <View style={styles.requestCard}>
    <View style={styles.requestInfo}>
      <Text style={styles.requestName}>{request.senderInfo.displayName}</Text>
      <Text style={styles.requestUsername}>@{request.senderInfo.username}</Text>
    </View>
    <View style={styles.requestActions}>
      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => onAccept(request)}
      >
        <Text style={styles.acceptButtonText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.rejectButton}
        onPress={() => onReject(request)}
      >
        <Text style={styles.rejectButtonText}>Reject</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20 
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#334155',
    borderRadius: 50,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0EA5E9',
  },
  tabText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFF',
  },
  online: {
    color: '#38BDF8',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  inviteBtn: {
    backgroundColor: '#93C5FD',
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteText: {
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  scrollArea: {
    paddingBottom: 40,
  },
  searchBar: {
    backgroundColor: '#1E293B',
    color: '#FFF',
    padding: 12,
    borderRadius: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchResultUsername: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  requestUsername: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rejectButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
});