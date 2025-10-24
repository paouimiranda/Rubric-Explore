// components/RichTextEditor/RichTextEditor.tsx (DIAGNOSTIC VERSION)
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
  isTyping: () => boolean;
  getCursorPosition: () => Promise<number>;
  setCursorPosition: (position: number) => void;
}

interface SerializedSelection {
  anchorPath: number[];
  anchorOffset: number;
  focusPath: number[];
  focusOffset: number;
  textPosition?: number; // Backup text-based position
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
  
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isLocalChange = useRef(false);
  const localChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const lastCursorPosition = useRef<number>(0);
  const isFocused = useRef(false);
  
  const pendingRemoteContent = useRef<string | null>(null);
  const isApplyingRemoteUpdate = useRef(false);
  
  const savedSelection = useRef<SerializedSelection | null>(null);
  
  const [pendingRequests] = useState<Map<string, {
    resolve: (value: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  // DIAGNOSTIC: Track if onMessage is working
  const [onMessageWorking, setOnMessageWorking] = useState<boolean | null>(null);

  /**
   * DIAGNOSTIC TEST
   */
  const testWebViewMessaging = useCallback(() => {
    if (!richText.current) return;

    console.log('🧪 Testing WebView messaging...');
    
    const testScript = `
      (function() {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'diagnosticTest',
              status: 'success',
              message: 'WebView messaging is working!'
            }));
          } else {
            console.error('ReactNativeWebView.postMessage not available');
          }
        } catch (e) {
          console.error('Test failed:', e);
        }
      })();
    `;

    richText.current.injectJavascript(testScript);
    
    // If we don't hear back in 1 second, messaging is broken
    setTimeout(() => {
      if (onMessageWorking === null) {
        console.error('❌ WebView messaging FAILED - onMessage prop not working!');
        console.error('💡 Solution: react-native-pell-rich-editor may not support onMessage');
        setOnMessageWorking(false);
      }
    }, 1000);
  }, [onMessageWorking]);

  /**
   * INJECT SELECTION UTILITIES
   */
  const injectSelectionUtilities = useCallback(() => {
    if (!richText.current) return;

    console.log('💉 Injecting selection utilities...');

    const utilScript = `
      (function() {
        if (window.__selectionUtilsInjected) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'utilsInjected',
            alreadyInjected: true
          }));
          return;
        }
        
        window.__selectionUtilsInjected = true;
        const editor = document.querySelector('.pell-content') || document.body;

        window.getNodePath = function(node, root) {
          if (node === root) return [];
          const path = [];
          let current = node;
          
          while (current && current !== root) {
            const parent = current.parentNode;
            if (!parent) break;
            const index = Array.from(parent.childNodes).indexOf(current);
            path.unshift(index);
            current = parent;
          }
          
          return path;
        };

        window.getNodeFromPath = function(root, path) {
          let node = root;
          for (let i = 0; i < path.length; i++) {
            if (!node.childNodes[path[i]]) return null;
            node = node.childNodes[path[i]];
          }
          return node;
        };

        window.serializeSelection = function() {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return null;
          
          const range = selection.getRangeAt(0);
          return {
            anchorPath: window.getNodePath(range.startContainer, editor),
            anchorOffset: range.startOffset,
            focusPath: window.getNodePath(range.endContainer, editor),
            focusOffset: range.endOffset
          };
        };

        window.deserializeSelection = function(sel) {
          const selection = window.getSelection();
          if (!selection) return false;
          
          const anchorNode = window.getNodeFromPath(editor, sel.anchorPath);
          const focusNode = window.getNodeFromPath(editor, sel.focusPath);
          
          if (!anchorNode || !focusNode) return false;
          
          const anchorMax = anchorNode.nodeType === Node.TEXT_NODE 
            ? anchorNode.length 
            : anchorNode.childNodes.length;
          const focusMax = focusNode.nodeType === Node.TEXT_NODE 
            ? focusNode.length 
            : focusNode.childNodes.length;
            
          const safeAnchor = Math.min(sel.anchorOffset, anchorMax);
          const safeFocus = Math.min(sel.focusOffset, focusMax);
          
          try {
            const range = document.createRange();
            range.setStart(anchorNode, safeAnchor);
            range.setEnd(focusNode, safeFocus);
            selection.removeAllRanges();
            selection.addRange(range);
            
            const tempSpan = document.createElement('span');
            tempSpan.style.display = 'inline';
            const cloned = range.cloneRange();
            cloned.collapse(true);
            cloned.insertNode(tempSpan);
            tempSpan.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
            tempSpan.remove();
            
            return true;
          } catch (e) {
            console.error('Deserialize error:', e);
            return false;
          }
        };

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'utilsInjected',
          success: true,
          alreadyInjected: false
        }));
      })();
    `;

    richText.current.injectJavascript(utilScript);
  }, []);

  /**
   * SERIALIZE SELECTION
   */
  const serializeSelection = useCallback((): Promise<SerializedSelection | null> => {
    return new Promise((resolve) => {
      if (!richText.current) {
        console.warn('⚠️ serializeSelection: richText.current is null');
        resolve(null);
        return;
      }

      if (!isFocused.current) {
        console.log('⏭️ serializeSelection: editor not focused, skipping');
        resolve(null);
        return;
      }

      const requestId = `serialize_${Date.now()}`;
      console.log(`📤 Requesting serialization (${requestId})...`);
      
      const timeout = setTimeout(() => {
        console.error(`❌ Serialization timeout (${requestId}) - using fallback`);
        pendingRequests.delete(requestId);
        resolve(savedSelection.current);
      }, 500);

      pendingRequests.set(requestId, { resolve, timeout });

      const script = `
        (function() {
          try {
            const sel = window.serializeSelection ? window.serializeSelection() : null;
            console.log('WebView: Serialized selection:', sel);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'serializedSelection',
              requestId: '${requestId}',
              selection: sel
            }));
          } catch (e) {
            console.error('WebView: Serialization error:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'serializedSelection',
              requestId: '${requestId}',
              selection: null,
              error: e.toString()
            }));
          }
        })();
      `;

      richText.current.injectJavascript(script);
    });
  }, [pendingRequests]);

  /**
   * DESERIALIZE SELECTION
   */
  const deserializeSelection = useCallback((selection: SerializedSelection): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!richText.current || !isFocused.current) {
        console.warn('⚠️ deserializeSelection: editor not ready or not focused');
        resolve(false);
        return;
      }

      const requestId = `deserialize_${Date.now()}`;
      console.log(`📤 Requesting deserialization (${requestId})...`, selection);
      
      const timeout = setTimeout(() => {
        console.error(`❌ Deserialization timeout (${requestId})`);
        pendingRequests.delete(requestId);
        resolve(false);
      }, 500);

      pendingRequests.set(requestId, { resolve, timeout });

      const script = `
        (function() {
          try {
            const sel = ${JSON.stringify(selection)};
            console.log('WebView: Deserializing selection:', sel);
            const success = window.deserializeSelection ? window.deserializeSelection(sel) : false;
            console.log('WebView: Deserialization result:', success);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selectionRestored',
              requestId: '${requestId}',
              success: success
            }));
          } catch (e) {
            console.error('WebView: Deserialization error:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selectionRestored',
              requestId: '${requestId}',
              success: false,
              error: e.toString()
            }));
          }
        })();
      `;

      richText.current.injectJavascript(script);
    });
  }, [pendingRequests]);

  /**
   * HANDLE WEBVIEW MESSAGES
   */
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      // Handle different event structures from react-native-pell-rich-editor
      let messageData: string;
      
      if (typeof event === 'string') {
        // Direct string
        messageData = event;
        console.log('🔔 RAW MESSAGE (string):', event);
      } else if (event?.nativeEvent?.data) {
        // Standard WebView format
        messageData = event.nativeEvent.data;
        console.log('🔔 RAW MESSAGE (nativeEvent.data):', event.nativeEvent.data);
      } else if (event?.data) {
        // Simplified format
        messageData = event.data;
        console.log('🔔 RAW MESSAGE (data):', event.data);
      } else {
        // Unknown format - log and try to parse anyway
        console.log('🔔 RAW MESSAGE (unknown format):', JSON.stringify(event));
        messageData = JSON.stringify(event);
      }
      
      const message = JSON.parse(messageData);
      const { type, requestId } = message;

      console.log(`📨 Parsed message type: ${type}, requestId: ${requestId}`);

      // Diagnostic test response
      if (type === 'diagnosticTest') {
        console.log('✅ WebView messaging IS WORKING!');
        setOnMessageWorking(true);
        return;
      }

      // Handle serialized selection response
      if (type === 'serializedSelection' && requestId) {
        const pending = pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(requestId);
          console.log(`✅ Serialization response received (${requestId}):`, message.selection);
          pending.resolve(message.selection);
          
          if (message.selection) {
            savedSelection.current = message.selection;
          }
        } else {
          console.warn(`⚠️ No pending request for ${requestId}`);
        }
      }

      // Handle selection restored response
      if (type === 'selectionRestored' && requestId) {
        const pending = pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(requestId);
          console.log(`✅ Deserialization response received (${requestId}): ${message.success}`);
          pending.resolve(message.success);
        } else {
          console.warn(`⚠️ No pending request for ${requestId}`);
        }
      }

      // Handle utils injection confirmation
      if (type === 'utilsInjected') {
        console.log('✅ Selection utilities injected', message);
      }
    } catch (error) {
      console.error('❌ Failed to handle WebView message:', error);
    }
  }, [pendingRequests]);

  /**
   * APPLY HTML WITH ACCURATE SELECTION
   */
  const applyHtmlWithAccurateSelection = useCallback(async (html: string) => {
    if (!richText.current) return;

    console.log('📥 applyHtmlWithAccurateSelection called, focused:', isFocused.current);

    // If not focused, safe to replace directly
    if (!isFocused.current) {
      console.log('⏭️ Editor not focused, applying HTML directly');
      richText.current.setContentHTML(html);
      lastContent.current = html;
      return;
    }

    try {
      console.log('💾 Step 1: Serializing selection...');
      const selection = await serializeSelection();
      
      if (selection) {
        console.log('✅ Selection serialized successfully:', {
          anchorPath: selection.anchorPath,
          anchorOffset: selection.anchorOffset
        });
      } else {
        console.warn('⚠️ Could not serialize selection');
      }

      console.log('📝 Step 2: Applying HTML update...');
      richText.current.setContentHTML(html);
      lastContent.current = html;

      console.log('⏳ Step 3: Waiting for DOM to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (isFocused.current && selection) {
        console.log('🔄 Step 4: Restoring selection...');
        const success = await deserializeSelection(selection);
        
        if (success) {
          console.log('✅✅✅ CURSOR PRESERVED SUCCESSFULLY! ✅✅✅');
        } else {
          console.error('❌❌❌ CURSOR RESTORATION FAILED! ❌❌❌');
        }
      } else {
        console.warn('⚠️ Skipping restoration - no selection or not focused');
      }
    } catch (error) {
      console.error('❌ Error in applyHtmlWithAccurateSelection:', error);
      richText.current.setContentHTML(html);
      lastContent.current = html;
    }
  }, [serializeSelection, deserializeSelection]);

  const getCursorPosition = useCallback(async (): Promise<number> => {
    return lastCursorPosition.current;
  }, []);

  const setCursorPosition = useCallback((position: number) => {
    lastCursorPosition.current = position;
  }, []);

  useImperativeHandle(ref, () => ({
    getContentHtml: async () => {
      if (richText.current) {
        return await richText.current.getContentHtml();
      }
      return '';
    },
    
    setContentHtml: async (html: string) => {
      if (html === lastContent.current) {
        console.log('⏭️ Content unchanged, skipping');
        return;
      }

      if (isLocalChange.current) {
        console.log('⏭️ Skipping self-echo');
        return;
      }

      if (isTyping.current) {
        console.log('⏸️ Queuing update - typing burst');
        pendingRemoteContent.current = html;
        return;
      }

      console.log('📥📥📥 REMOTE UPDATE RECEIVED 📥📥📥');
      isApplyingRemoteUpdate.current = true;
      
      try {
        await applyHtmlWithAccurateSelection(html);
      } finally {
        isApplyingRemoteUpdate.current = false;
      }
    },
    
    focusEditor: () => {
      richText.current?.focusContentEditor();
      isFocused.current = true;
    },
    
    blurEditor: () => {
      richText.current?.blurContentEditor();
      isFocused.current = false;
      savedSelection.current = null;
    },
    
    getEditor: () => richText.current,
    isTyping: () => isTyping.current,
    getCursorPosition,
    setCursorPosition,
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      testWebViewMessaging();
      injectSelectionUtilities();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [injectSelectionUtilities, testWebViewMessaging]);

  useEffect(() => {
    if (richText.current && onEditorReady) {
      onEditorReady(richText.current);
      setTimeout(() => {
        testWebViewMessaging();
        injectSelectionUtilities();
      }, 500);
    }
  }, [onEditorReady, injectSelectionUtilities, testWebViewMessaging]);

  useEffect(() => {
    if (isInitialMount.current && richText.current && initialContent) {
      console.log('🎬 Setting initial content');
      richText.current.setContentHTML(initialContent);
      lastContent.current = initialContent;
      isInitialMount.current = false;
    }
  }, [initialContent]);

  const handleCursorPosition = useCallback(async (position: number) => {
    if (!isApplyingRemoteUpdate.current) {
      lastCursorPosition.current = position;
      onCursorPosition?.(position);
    }
  }, [onCursorPosition]);

  const handleContentChange = useCallback((html: string) => {
    if (html === lastContent.current) {
      return;
    }
    
    if (isApplyingRemoteUpdate.current) {
      return;
    }
    
    console.log('✏️ Local typing detected');
    
    isLocalChange.current = true;
    if (localChangeTimeoutRef.current) {
      clearTimeout(localChangeTimeoutRef.current);
    }
    localChangeTimeoutRef.current = setTimeout(() => {
      isLocalChange.current = false;
    }, 200);
    
    isTyping.current = true;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    lastContent.current = html;
    onContentChange(html);
    
    typingTimeoutRef.current = setTimeout(async () => {
      console.log('⏸️ Typing burst ended');
      isTyping.current = false;
      
      if (pendingRemoteContent.current && richText.current) {
        console.log('📥 Applying queued remote update');
        const pendingHtml = pendingRemoteContent.current;
        pendingRemoteContent.current = null;
        
        isApplyingRemoteUpdate.current = true;
        try {
          await applyHtmlWithAccurateSelection(pendingHtml);
        } finally {
          isApplyingRemoteUpdate.current = false;
        }
      }
    }, 400);
  }, [onContentChange, applyHtmlWithAccurateSelection]);

  const handleFocus = useCallback(async () => {
    isFocused.current = true;
    console.log('🎯 Editor focused');
    injectSelectionUtilities();
  }, [injectSelectionUtilities]);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    savedSelection.current = null;
    console.log('💤 Editor blurred');
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (localChangeTimeoutRef.current) {
        clearTimeout(localChangeTimeoutRef.current);
      }
      pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
      pendingRequests.clear();
    };
  }, [pendingRequests]);

  return (
    <View style={[styles.container, style]}>
      <RichEditor
        ref={richText}
        onChange={handleContentChange}
        onCursorPosition={handleCursorPosition}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={!editable}
        initialContentHTML={initialContent}
        onMessage={handleWebViewMessage}
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