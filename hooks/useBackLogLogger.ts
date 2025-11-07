import { BacklogEvent } from "@/services/backlogEvents";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Alert } from "react-native";
import { auth, db } from "../firebase";

const BACKLOG_KEY = "pending_backlogs";
const MAX_LOCAL_LOGS = 500;  // ✅ NEW: Limit to 500 logs locally to prevent storage issues

export const useBacklogLogger = () => {
  
  // ✅ UPDATED: Save backlog locally with limit (prevents AsyncStorage bloat)
  const addBacklogEvent = async (
    event: BacklogEvent | string,
    data: any = {},
    showAlert: boolean = false
  ) => {
    const user = auth.currentUser;

    const log = {
      event,
      userId: user?.uid ?? null,
      username: user?.displayName ?? null,
      timestamp: Date.now(),
      ...data,
    };

    const stored = await AsyncStorage.getItem(BACKLOG_KEY);
    const logs = stored ? JSON.parse(stored) : [];

    // ✅ NEW: Enforce 500-log limit (delete oldest if exceeded)
    if (logs.length >= MAX_LOCAL_LOGS) {
      logs.shift();  // Remove oldest log
    }

    logs.push(log);
    await AsyncStorage.setItem(BACKLOG_KEY, JSON.stringify(logs));

    console.log("📌 Backlog stored locally:", event);

    if (showAlert) Alert.alert("Notice", `Event Logged: ${event}`);
  };

  // ✅ UPDATED: Upload each log as a separate document in a subcollection (avoids 1MB limit)
  const uploadBacklogs = async () => {
    const stored = await AsyncStorage.getItem(BACKLOG_KEY);
    if (!stored) return;

    const logs = JSON.parse(stored);
    if (logs.length === 0) return;

    const user = auth.currentUser;
    const userId = user?.uid ?? "anonymous";  // Fallback for non-logged-in users

    try {
      // Upload each log as its own document in subcollection: backlogs/{userId}/logs/{autoId}
      const uploadPromises = logs.map((log: any) =>
        addDoc(collection(db, "backlogs", userId, "logs"), {
          ...log,
          uploadedAt: serverTimestamp(),  // When it hit Firestore
        })
      );

      await Promise.all(uploadPromises);  // Batch upload all at once
      await AsyncStorage.removeItem(BACKLOG_KEY);
      console.log("✅ Backlogs uploaded as subcollection docs:", logs.length);
    } catch (error) {
      console.warn("⚠️ Failed to upload batch:", error);
    }
  };

  // ✅ Replacement for your useErrorHandler
  const logError = (
    error: unknown,
    context: string,
    email?: string,
    registered?: boolean
  ) => {
    const msg =
      error instanceof Error ? error.message : String(error);

    // ✅ Log error but also show alert
    addBacklogEvent("error_event", {
      message: msg,
      context,
      email: email || "Unknown",
      registered: registered ?? false,
    }, true);
  };

  return {
    addBacklogEvent,
    uploadBacklogs,
    logError,
  };
};