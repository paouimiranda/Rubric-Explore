import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text, TextInput } from 'react-native-paper';

export default function App() {
  const [name, setName] = useState("John Doe");
  const [bio, setBio] = useState("Bio here Bio here Bio here");
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [field3, setField3] = useState("");
  const [field4, setField4] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed to upload a profile photo.');
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            ) : (
              <Avatar.Icon size={100} icon="account" style={styles.avatar} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>NAME</Text>
        <TextInput
          mode="outlined"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          mode="flat"
          style={styles.bio}
          multiline
          value={bio}
          onChangeText={setBio}
        />

        <View style={styles.row}>
          <TextInput
            mode="outlined"
            style={styles.halfInput}
            placeholder="Field 1"
            value={field1}
            onChangeText={setField1}
          />
          <TextInput
            mode="outlined"
            style={styles.halfInput}
            placeholder="Field 2"
            value={field2}
            onChangeText={setField2}
          />
        </View>

        <TextInput
          mode="outlined"
          style={styles.input}
          placeholder="Field 3"
          value={field3}
          onChangeText={setField3}
        />

        <TextInput
          mode="outlined"
          style={styles.input}
          placeholder="Field 4"
          value={field4}
          onChangeText={setField4}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F54',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#B0C4DE',
    width: '100%',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 50,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    marginBottom: -50,
    zIndex: -1,
  },
  imageWrapper: {
    backgroundColor: '#ddd',
    borderRadius: 100,
    padding: 5,
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: '#ccc',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  label: {
    color: '#fff',
    marginTop: 60,
    fontSize: 20,
    fontWeight: 'bold',
  },
  bio: {
    width: '90%',
    backgroundColor: 'transparent',
    color: '#fff',
    marginVertical: 10,
  },
  input: {
    width: '90%',
    marginVertical: 6,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
    marginVertical: 6,
    backgroundColor: '#fff',
  },
});
