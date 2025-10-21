import { useAuth } from '@/app/contexts/AuthContext';
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [plans, setPlans] = useState<{ [key: string]: { text: string; time: string }[] }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [planText, setPlanText] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timeObj, setTimeObj] = useState(new Date());

  const { user, userData, loading } = useAuth();

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    console.log('🔐 Auth State Changed:');
    console.log('Loading:', loading);
    console.log('User:', user?.uid);
    console.log('UserData:', userData?.username);
  }, [user, userData, loading]);

  const loadPlans = async () => {
    const stored = await AsyncStorage.getItem("plans");
    if (stored) setPlans(JSON.parse(stored));
  };

  const savePlans = async (newPlans: any) => {
    setPlans(newPlans);
    await AsyncStorage.setItem("plans", JSON.stringify(newPlans));
  };

  const addPlan = () => {
    if (!planText || !planTime) {
      Alert.alert("Missing Information", "Please enter both plan and time.");
      return;
    }
    
    const newPlans = { 
      ...plans, 
      [selectedDate]: [...(plans[selectedDate] || []), { text: planText, time: planTime }] 
    };
    savePlans(newPlans);
    
    setPlanText("");
    setPlanTime("");
    setModalVisible(false);
    Alert.alert("Success", "Plan added successfully!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PLANNER</Text>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{ [selectedDate]: { selected: true, marked: true } }}
        theme={{ todayTextColor: "#00adf5", selectedDayBackgroundColor: "#00adf5" }}
      />

      <Text style={styles.subTitle}>Plans:</Text>
      {plans[selectedDate]?.length ? (
        <FlatList
          data={plans[selectedDate]}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <Text style={styles.planItem}>• {item.text} at {item.time}</Text>}
        />
      ) : (
        <Text style={styles.noPlans}>No plans for this day</Text>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput placeholder="Plan" style={styles.input} value={planText} onChangeText={setPlanText} />

            {/* Time Picker */}
            <TouchableOpacity style={styles.input} onPress={() => setTimePickerVisible(true)}>
              <Text>{planTime ? planTime : "Pick Time"}</Text>
            </TouchableOpacity>
            {timePickerVisible && (
              <DateTimePicker
                value={timeObj}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setTimePickerVisible(false);
                  if (selectedTime) {
                    setTimeObj(selectedTime);
                    const hours = selectedTime.getHours().toString().padStart(2, "0");
                    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
                    setPlanTime(`${hours}:${minutes}`);
                  }
                }}
              />
            )}

            <TouchableOpacity style={styles.saveButton} onPress={addPlan}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a1d3d", padding: 20 },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  subTitle: { color: "#fff", fontSize: 18, marginTop: 20 },
  noPlans: { color: "#ccc", fontSize: 16, marginTop: 10 },
  planItem: { color: "#fff", fontSize: 16, paddingVertical: 5 },
  addButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#00adf5",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontSize: 30 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "80%" },
  input: { borderBottomWidth: 1, borderColor: "#ccc", marginBottom: 15, padding: 8 },
  saveButton: { backgroundColor: "#00adf5", padding: 10, borderRadius: 5 },
  saveButtonText: { color: "#fff", textAlign: "center" },
  cancelButton: { color: "red", textAlign: "center", marginTop: 10 },
});