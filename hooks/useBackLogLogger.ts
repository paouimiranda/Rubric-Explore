// hooks/useBackLogLogger.ts
import { BacklogEvent } from "@/services/backlogEvents";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, deleteDoc, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { auth, db } from "../firebase";

const BACKLOG_KEY = "pending_backlogs";
const MAX_LOCAL_LOGS = 500;
const MAX_FIREBASE_LOGS = 5000;
const UPLOAD_BATCH_SIZE = 50; // Upload in smaller batches to avoid rate limits

export const useBacklogLogger = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const loadedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const loadQueue = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    try {
      const stored = await AsyncStorage.getItem(BACKLOG_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      setQueue(logs);
      console.log("📌 Queue loaded on mount:", logs.length, "logs");
    } catch (error) {
      console.warn("⚠️ Failed to load queue:", error);
      setQueue([]); // Fallback to empty queue
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Sync queue to AsyncStorage reactively
  useEffect(() => {
    const saveQueue = async () => {
      try {
        await AsyncStorage.setItem(BACKLOG_KEY, JSON.stringify(queue));
      } catch (error) {
        console.warn("⚠️ Failed to save queue:", error);
      }
    };
    if (loadedRef.current) saveQueue();
  }, [queue]);

  const cleanupFirebaseLogs = useCallback(async (userId: string) => {
    try {
      const logsRef = collection(db, "backlogs", userId, "logs");
      const q = query(logsRef, orderBy("timestamp", "asc"), limit(MAX_FIREBASE_LOGS + 1));
      const snapshot = await getDocs(q);

      if (snapshot.size > MAX_FIREBASE_LOGS) {
        const docsToDelete = snapshot.docs.slice(0, snapshot.size - MAX_FIREBASE_LOGS);
        const deletePromises = docsToDelete.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log("🗑️ Deleted", docsToDelete.length, "oldest Firebase logs");
      }
    } catch (error) {
      console.warn("⚠️ Failed to cleanup Firebase logs:", error);
    }
  }, []);

  const uploadBacklogs = useCallback(async () => {
    if (queue.length === 0) return;

    const user = auth.currentUser;
    const userId = user?.uid ?? "anonymous";

    try {
      // Upload in batches
      const batches = [];
      for (let i = 0; i < queue.length; i += UPLOAD_BATCH_SIZE) {
        batches.push(queue.slice(i, i + UPLOAD_BATCH_SIZE));
      }

      for (const batch of batches) {
        const uploadPromises = batch.map((log: any) =>
          addDoc(collection(db, "backlogs", userId, "logs"), {
            ...log,
            uploadedAt: serverTimestamp(),
          })
        );
        await Promise.all(uploadPromises);
      }

      setQueue([]);
      console.log("✅ Backlogs uploaded:", queue.length);

      // Cleanup Firebase (non-blocking)
      cleanupFirebaseLogs(userId);
    } catch (error) {
      console.warn("⚠️ Failed to upload batch:", error);
    }
  }, [queue, cleanupFirebaseLogs]);

  const addBacklogEvent = useCallback(async (
    event: BacklogEvent | string,
    data: any = {},
    showAlert: boolean = false
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const user = auth.currentUser;
      const log = {
        event,
        userId: user?.uid ?? null,
        username: user?.displayName ?? null,
        timestamp: Date.now(),
        ...data,
      };

      setQueue(prev => {
        const newQueue = [...prev, log];
        if (newQueue.length > MAX_LOCAL_LOGS) newQueue.shift(); // Enforce limit
        console.log("📌 Backlog added:", event, "Queue length:", newQueue.length);

        // Auto-upload if at limit
        if (newQueue.length >= MAX_LOCAL_LOGS) {
          console.log("🚀 Auto-uploading due to queue limit");
          uploadBacklogs();
        }

        return newQueue;
      });

      if (showAlert) Alert.alert("Notice", `Event Logged: ${event}`);
    }, 500);
  }, [uploadBacklogs]);

  const logError = useCallback((
    error: unknown,
    context: string,
    email?: string,
    registered?: boolean
  ) => {
    const msg = error instanceof Error ? error.message : String(error);
    addBacklogEvent("error_event", {
      message: msg,
      context,
      email: email || "Unknown",
      registered: registered ?? false,
    }, true);
  }, [addBacklogEvent]);
  
   useEffect(() => {
    const interval = setInterval(() => {
      if (queue.length > 0) {
        console.log("⏰ Periodic upload triggered (10 minutes)");
        uploadBacklogs().catch((error) => {
          console.warn("⚠️ Failed periodic upload:", error);
        });
      }
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [queue, uploadBacklogs]);
  return useMemo(() => ({
    addBacklogEvent,
    uploadBacklogs,
    logError,
  }), [addBacklogEvent, uploadBacklogs, logError]);
};