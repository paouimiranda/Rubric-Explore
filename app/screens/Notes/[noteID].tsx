import { useLocalSearchParams } from 'expo-router';
import NoteEditor from './note-editor';

export default function SharedNotePage() {
  const params = useLocalSearchParams();
  
  return (
    <NoteEditor
      isSharedAccess={params.isSharedAccess === 'true'}
      sharedPermission={params.permission as 'view' | 'edit'}
      // Note: sharedNote will be fetched by the component itself
    />
  );
}