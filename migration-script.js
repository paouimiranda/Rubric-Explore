// migrate-all-user-conversations.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account key
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccount.json'),  // Replace with your key file path
  databaseURL: "https://rubric-app-8f65c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

async function migrateAllUserConversations() {
  console.log('Starting full migration of all userConversations...');
  
  // Get all conversations
  const conversationsSnapshot = await db.collection('conversations').get();
  console.log(`Found ${conversationsSnapshot.size} conversations to process.`);
  
  let batch = db.batch();  // Use batch for efficiency (Firestore limits batches to 500 operations)
  let operationCount = 0;
  const BATCH_SIZE = 400;  // Stay under Firestore's 500-operation limit
  
  for (const convDoc of conversationsSnapshot.docs) {
    const convData = convDoc.data();
    const convId = convDoc.id;
    const participants = convData.participants || [];
    
    console.log(`Processing conversation ${convId} with participants: ${participants.join(', ')}`);
    
    for (const userId of participants) {
      const userConvRef = db.collection('userConversations').doc(userId).collection('conversations').doc(convId);
      const userConvSnap = await userConvRef.get();
      
      if (!userConvSnap.exists) {
        // Create the missing document with initial data
        const userConvData = {
          conversationId: convId,
          lastMessageTime: convData.lastMessageTime || admin.firestore.FieldValue.serverTimestamp(),
          unreadCount: convData.unreadCount?.[userId] || 0,
          isDeleted: false
        };
        
        batch.set(userConvRef, userConvData);
        operationCount++;
        
        console.log(`Queued creation for userConversations/${userId}/conversations/${convId}`);
        
        // Commit batch if it reaches the limit
        if (operationCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${operationCount} operations.`);
          batch = db.batch();  // Start a new batch
          operationCount = 0;
        }
      } else {
        console.log(`Skipped existing doc for userConversations/${userId}/conversations/${convId}`);
      }
    }
  }
  
  // Commit any remaining operations
  if (operationCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${operationCount} operations.`);
  }
  
  console.log('Migration complete! All userConversations documents have been created or verified.');
}

// Run the migration
migrateAllUserConversations().catch((error) => {
  console.error('Migration failed:', error);
});