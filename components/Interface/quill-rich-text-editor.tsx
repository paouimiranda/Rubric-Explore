// components/Interface/QuillRichTextEditor.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface QuillEditorProps {
  initialContent?: string;
  onTextChange?: (html: string, delta: any, plainText: string) => void;
  onSelectionChange?: (range: { index: number; length: number } | null) => void;
  placeholder?: string;
  style?: any;
  readOnly?: boolean;
}

export interface QuillEditorHandle {
  focus: () => void;
  blur: () => void;
  getContents: () => Promise<any>;
  getHTML: () => Promise<string>;
  getText: () => Promise<string>;
  setContents: (delta: any) => void;
  insertText: (text: string) => void;
  format: (format: string, value: any) => void;
}

const QuillRichTextEditor = forwardRef<QuillEditorHandle, QuillEditorProps>(({
  initialContent = '',
  onTextChange,
  onSelectionChange,
  placeholder = 'Start typing...',
  style,
  readOnly = false,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => {
      webViewRef.current?.injectJavaScript('window.quillEditor.focus();');
    },
    blur: () => {
      webViewRef.current?.injectJavaScript('window.quillEditor.blur();');
    },
    getContents: () => {
      return new Promise((resolve) => {
        webViewRef.current?.injectJavaScript(`
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'getContents',
            data: window.quillEditor.getContents()
          }));
        `);
        // You'd need to implement a promise resolver here
      });
    },
    getHTML: () => {
      return new Promise((resolve) => {
        webViewRef.current?.injectJavaScript(`
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'getHTML',
            data: window.quillEditor.root.innerHTML
          }));
        `);
      });
    },
    getText: () => {
      return new Promise((resolve) => {
        webViewRef.current?.injectJavaScript(`
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'getText',
            data: window.quillEditor.getText()
          }));
        `);
      });
    },
    setContents: (delta: any) => {
      webViewRef.current?.injectJavaScript(`
        window.quillEditor.setContents(${JSON.stringify(delta)});
      `);
    },
    insertText: (text: string) => {
      webViewRef.current?.injectJavaScript(`
        window.quillEditor.insertText(window.quillEditor.getLength(), ${JSON.stringify(text)});
      `);
    },
    format: (format: string, value: any) => {
      webViewRef.current?.injectJavaScript(`
        window.quillEditor.format(${JSON.stringify(format)}, ${JSON.stringify(value)});
      `);
    },
  }));

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          setIsReady(true);
          break;
        case 'text-change':
          onTextChange?.(message.html, message.delta, message.text);
          break;
        case 'selection-change':
          onSelectionChange?.(message.range);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    }
    return JSON.stringify(value);
  };

  const injectedJavaScript = `
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
    true;
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }
    
    #editor-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    #editor {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .ql-editor {
      padding: 0;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .ql-editor.ql-blank::before {
      color: #9ca3af;
      font-style: normal;
      left: 0;
    }
    
    /* Hide Quill's default toolbar since we're using external toolbar */
    .ql-toolbar {
      display: none;
    }
    
    /* Custom scrollbar for better mobile experience */
    ::-webkit-scrollbar {
      width: 4px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div id="editor-container">
    <div id="editor"></div>
  </div>

  <script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
  <script>
    // Initialize Quill
    const quill = new Quill('#editor', {
      theme: 'snow',
      modules: {
        toolbar: false, // We'll control formatting from React Native
      },
      placeholder: ${JSON.stringify(placeholder)},
      readOnly: ${readOnly},
    });

    // Store globally for external access
    window.quillEditor = quill;

    // Initial content
    ${initialContent ? `quill.setContents(${JSON.stringify(initialContent)});` : ''}

    // Notify React Native when ready
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ready'
    }));

    // Listen to text changes
    quill.on('text-change', function(delta, oldDelta, source) {
      if (source === 'user') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'text-change',
          html: quill.root.innerHTML,
          delta: quill.getContents(),
          text: quill.getText(),
        }));
      }
    });

    // Listen to selection changes
    quill.on('selection-change', function(range, oldRange, source) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'selection-change',
        range: range,
      }));
    });

    // Prevent zoom on input focus (iOS)
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        style={styles.webView}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        showsVerticalScrollIndicator={true}
        keyboardDisplayRequiresUserAction={false}
        // iOS specific
        allowsInlineMediaPlayback={true}
        dataDetectorTypes="none"
      />
    </View>
  );
});

QuillRichTextEditor.displayName = 'QuillRichTextEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default QuillRichTextEditor;