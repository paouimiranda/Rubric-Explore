// components/RichTextEditor/RichTextEditor.tsx (PRODUCTION)
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
  textPosition?: number;
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

  const extractPlainTextFromHtml = (html: string): string => {
    if (!html) return '';
    
    // Remove script and style tags completely
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove images, videos, iframes, and other media elements
    text = text.replace(/<img[^>]*>/gi, '');
    text = text.replace(/<video[^>]*>.*?<\/video>/gi, '');
    text = text.replace(/<audio[^>]*>.*?<\/audio>/gi, '');
    text = text.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    text = text.replace(/<svg[^>]*>.*?<\/svg>/gi, '');
    text = text.replace(/<canvas[^>]*>.*?<\/canvas>/gi, '');
    
    // Replace block-level elements with newlines
    text = text.replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n');
    text = text.replace(/<\/?(ul|ol|table|tbody|thead)[^>]*>/gi, '\n\n');
    
    // Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#039;/g, "'");
    text = text.replace(/&apos;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple newlines to double
    text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single
    text = text.trim();
    
    return text;
  };
  
  
  const [pendingRequests] = useState<Map<string, {
    resolve: (value: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  const [onMessageWorking, setOnMessageWorking] = useState<boolean | null>(null);

  const testWebViewMessaging = useCallback(() => {
    if (!richText.current) return;
    
    const testScript = `
      (function() {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'diagnosticTest',
              status: 'success',
              message: 'WebView messaging is working!'
            }));
          }
        } catch (e) {}
      })();
    `;

    richText.current.injectJavascript(testScript);
    
    setTimeout(() => {
      if (onMessageWorking === null) {
        setOnMessageWorking(false);
      }
    }, 1000);
  }, [onMessageWorking]);

  const injectSelectionUtilities = useCallback(() => {
    if (!richText.current) return;

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

  const serializeSelection = useCallback((): Promise<SerializedSelection | null> => {
    return new Promise((resolve) => {
      if (!richText.current || !isFocused.current) {
        resolve(null);
        return;
      }

      const requestId = `serialize_${Date.now()}`;
      
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve(savedSelection.current);
      }, 500);

      pendingRequests.set(requestId, { resolve, timeout });

      const script = `
        (function() {
          try {
            const sel = window.serializeSelection ? window.serializeSelection() : null;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'serializedSelection',
              requestId: '${requestId}',
              selection: sel
            }));
          } catch (e) {
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

  const deserializeSelection = useCallback((selection: SerializedSelection): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!richText.current || !isFocused.current) {
        resolve(false);
        return;
      }

      const requestId = `deserialize_${Date.now()}`;
      
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve(false);
      }, 500);

      pendingRequests.set(requestId, { resolve, timeout});

      const script = `
        (function() {
          try {
            const sel = ${JSON.stringify(selection)};
            const success = window.deserializeSelection ? window.deserializeSelection(sel) : false;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selectionRestored',
              requestId: '${requestId}',
              success: success
            }));
          } catch (e) {
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

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      let messageData: string;
      
      if (typeof event === 'string') {
        messageData = event;
      } else if (event?.nativeEvent?.data) {
        messageData = event.nativeEvent.data;
      } else if (event?.data) {
        messageData = event.data;
      } else {
        messageData = JSON.stringify(event);
      }
      
      const message = JSON.parse(messageData);
      const { type, requestId } = message;

      if (type === 'diagnosticTest') {
        setOnMessageWorking(true);
        return;
      }

      if (type === 'serializedSelection' && requestId) {
        const pending = pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(requestId);
          pending.resolve(message.selection);
          
          if (message.selection) {
            savedSelection.current = message.selection;
          }
        }
      }

      if (type === 'selectionRestored' && requestId) {
        const pending = pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(requestId);
          pending.resolve(message.success);
        }
      }
    } catch (error) {
      // Silently handle errors in production
    }
  }, [pendingRequests]);

  const applyHtmlWithAccurateSelection = useCallback(async (html: string) => {
    if (!richText.current) return;

    if (!isFocused.current) {
      richText.current.setContentHTML(html);
      lastContent.current = html;
      return;
    }

    try {
      const selection = await serializeSelection();
      
      richText.current.setContentHTML(html);
      lastContent.current = html;

      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (isFocused.current && selection) {
        await deserializeSelection(selection);
      }
    } catch (error) {
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
        return;
      }

      if (isLocalChange.current) {
        return;
      }

      if (isTyping.current) {
        pendingRemoteContent.current = html;
        return;
      }

      isApplyingRemoteUpdate.current = true;
      
      try {
        await applyHtmlWithAccurateSelection(html);
      } finally {
        isApplyingRemoteUpdate.current = false;
      }
    },
    
    getPlainText: async () => {
      if (richText.current) {
        const html = await richText.current.getContentHtml();
        return extractPlainTextFromHtml(html);
      }
      return '';
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
      isTyping.current = false;
      
      if (pendingRemoteContent.current && richText.current) {
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
    injectSelectionUtilities();
  }, [injectSelectionUtilities]);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    savedSelection.current = null;
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