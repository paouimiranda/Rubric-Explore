import { db } from '@/firebase';
import {
  collection,
  DocumentData,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

interface User {
  id: string;
  username: string;
  email: string;
}

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<User[]>([]);

  const handleSearch = async () => {
    if (searchText.trim() === '') {
      setResults([]);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchText),
        where('username', '<=', searchText + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      const users: User[] = [];

      snapshot.forEach((doc: DocumentData) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          username: data.username,
          email: data.email,
        });
      });

      setResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchText]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search users..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.input}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.username}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  item: {
    padding: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
