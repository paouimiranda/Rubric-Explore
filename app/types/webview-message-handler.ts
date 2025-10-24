// utils/webview-message-handler.ts
/**
 * WebView Message Handler for Pell Rich Editor
 * 
 * This utility helps bridge messages between React Native and WebView
 * Since react-native-pell-rich-editor doesn't expose direct message handling,
 * we use a global handler pattern
 */

type MessageHandler = (data: any) => void;

class WebViewMessageBridge {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private messageQueue: any[] = [];
  private isProcessing = false;

  /**
   * Register a handler for a specific message type
   */
  register(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    
    const handlers = this.handlers.get(type)!;
    handlers.push(handler);
    
    // Return unregister function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle incoming message from WebView
   */
  handleMessage(message: any) {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      if (data.type) {
        const handlers = this.handlers.get(data.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in handler for ${data.type}:`, error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to handle WebView message:', error);
    }
  }

  /**
   * Clear all handlers
   */
  clear() {
    this.handlers.clear();
  }
}

export const webViewMessageBridge = new WebViewMessageBridge();

/**
 * Hook to register WebView message handlers
 */
export function useWebViewMessage(type: string, handler: MessageHandler) {
  React.useEffect(() => {
    const unregister = webViewMessageBridge.register(type, handler);
    return unregister;
  }, [type, handler]);
}

// For React import
import React from 'react';
