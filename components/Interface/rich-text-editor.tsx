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
  const isLocalChange = useRef(false); // Track if change is from local typing

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
        console.log('Setting content from remote update');
        richText.current.setContentHTML(html);
        lastContent.current = html;
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
      richText.current.setContentHTML(initialContent);
      lastContent.current = initialContent;
      isInitialMount.current = false;
    }
  }, [initialContent]);

  const handleContentChange = useCallback((html: string) => {
    // Mark as local change
    isLocalChange.current = true;
    
    // Avoid feedback loops
    if (html !== lastContent.current) {
      lastContent.current = html;
      onContentChange(html);
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isLocalChange.current = false;
    }, 100);
  }, [onContentChange]);

  const handleCursorPosition = useCallback((position: number) => {
    onCursorPosition?.(position);
  }, [onCursorPosition]);

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