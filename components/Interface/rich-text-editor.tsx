// components/RichTextEditor/RichTextEditor.tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { RichEditor } from 'react-native-pell-rich-editor';

interface RichTextEditorProps {
  initialContent: string;
  onContentChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  onCursorPosition?: (position: number) => void;
  style?: any;
  onEditorReady?: (editor: any) => void;
}

export interface RichTextEditorRef {
  getContentHtml: () => Promise<string>;
  setContentHtml: (html: string) => void;
  focusEditor: () => void;
  blurEditor: () => void;
  getEditor: () => any;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialContent,
  onContentChange,
  editable = true,
  placeholder = "Start writing...",
  onCursorPosition,
  style,
  onEditorReady
}, ref) => {
  const richText = useRef<RichEditor>(null);
  const isInitialMount = useRef(true);
  const lastContent = useRef(initialContent);
  const isLocalChange = useRef(false);
  const lastCursorPosition = useRef(0);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    getContentHtml: async () => {
      if (richText.current) {
        return await richText.current.getContentHtml();
      }
      return '';
    },
    setContentHtml: (html: string) => {
      // Only update if content actually changed AND it's not from local typing
      if (richText.current && html !== lastContent.current && !isLocalChange.current) {
        console.log('📝 Setting content from remote update, preserving cursor...');
        
        // Save cursor position before update
        const savedPosition = lastCursorPosition.current;
        
        // Update content
        richText.current.setContentHTML(html);
        lastContent.current = html;
        
        // Attempt to restore cursor position after a brief delay
        setTimeout(() => {
          if (richText.current && savedPosition > 0) {
            console.log('📍 Attempting to restore cursor to position:', savedPosition);
            // Note: react-native-pell-rich-editor doesn't have built-in cursor restoration
            // The WebView will try to maintain focus naturally
            richText.current.focusContentEditor();
          }
        }, 50);
      }
    },
    focusEditor: () => {
      richText.current?.focusContentEditor();
    },
    blurEditor: () => {
      richText.current?.blurContentEditor();
    },
    getEditor: () => richText.current,
  }));

  // Notify parent when editor is ready
  useEffect(() => {
    if (richText.current && onEditorReady) {
      onEditorReady(richText.current);
    }
  }, [onEditorReady]);

  // Set initial content
  useEffect(() => {
    if (isInitialMount.current && richText.current && initialContent) {
      console.log('🎬 Setting initial content');
      richText.current.setContentHTML(initialContent);
      lastContent.current = initialContent;
      isInitialMount.current = false;
    }
  }, [initialContent]);

  const handleContentChange = useCallback((html: string) => {
    console.log('✏️ Content changed locally');
    
    // Mark as local change
    isLocalChange.current = true;
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Avoid feedback loops
    if (html !== lastContent.current) {
      lastContent.current = html;
      onContentChange(html);
    }
    
    // Reset flag after processing
    updateTimeoutRef.current = setTimeout(() => {
      isLocalChange.current = false;
      console.log('✅ Local change flag reset');
    }, 200);
  }, [onContentChange]);

  const handleCursorPosition = useCallback((position: number) => {
    lastCursorPosition.current = position;
    console.log('📍 Cursor position:', position);
    onCursorPosition?.(position);
  }, [onCursorPosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      <RichEditor
        ref={richText}
        onChange={handleContentChange}
        onCursorPosition={handleCursorPosition}
        placeholder={placeholder}
        disabled={!editable}
        initialContentHTML={initialContent}
        editorStyle={{
          backgroundColor: 'transparent',
          color: '#ffffff',
          placeholderColor: '#9ca3af',
          contentCSSText: `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 12px;
            min-height: 200px;
          `
        }}
        useContainer={true}
        pasteAsPlainText={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});

export default RichTextEditor;