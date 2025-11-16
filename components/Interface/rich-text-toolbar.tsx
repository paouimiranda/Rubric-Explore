// components/RichTextEditor/RichTextToolbar.tsx (UPDATED with fixed keyboard button)
import { createToolbarThemedStyles } from '@/constants/themedStyles';
import { ThemeColors, ThemeMode, useTheme } from '@/hooks/useTheme';
import { pickImage, takePhoto, uploadNoteImage } from '@/services/image-service';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { RichToolbar, actions } from 'react-native-pell-rich-editor';
import DrawingScreen from '../RichTextEditor/drawing-screen';
import MathEquationBuilder from '../RichTextEditor/math-equation-builder';
import TableBuilder from '../RichTextEditor/table-builder';

interface RichTextToolbarProps {
  getEditor: () => any;
  onMetadataPress: () => void;
  noteId: string;
  userId: string;
  style?: any;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const COLORS = [
  { value: '#000000', display: '#000000', label: 'Black' },
  { value: '#ffffff', display: '#ffffff', label: 'White' },
  { value: '#ef4444', display: '#ef4444', label: 'Red' },
  { value: '#f59e0b', display: '#f59e0b', label: 'Orange' },
  { value: '#10b981', display: '#10b981', label: 'Green' },
  { value: '#3b82f6', display: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', display: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', display: '#ec4899', label: 'Pink' },
  { value: '#6b7280', display: '#6b7280', label: 'Gray' },
  { value: '#d1d5db', display: '#d1d5db', label: 'Light Gray' },
  { value: '#fca5a5', display: '#fca5a5', label: 'Light Red' },
  { value: '#fcd34d', display: '#fcd34d', label: 'Yellow' },
  { value: '#6ee7b7', display: '#6ee7b7', label: 'Light Green' },
  { value: '#93c5fd', display: '#93c5fd', label: 'Light Blue' },
  { value: '#c4b5fd', display: '#c4b5fd', label: 'Light Purple' },
  { value: '#f9a8d4', display: '#f9a8d4', label: 'Light Pink' },
];

const HIGHLIGHT_COLORS = [
  { value: '#fef3c7', display: '#fef3c7', label: 'Yellow' },
  { value: '#dbeafe', display: '#dbeafe', label: 'Blue' },
  { value: '#dcfce7', display: '#dcfce7', label: 'Green' },
  { value: '#fce7f3', display: '#fce7f3', label: 'Pink' },
  { value: '#f3e8ff', display: '#f3e8ff', label: 'Purple' },
  { value: '#ffedd5', display: '#ffedd5', label: 'Orange' },
  { value: '#fecaca', display: '#fecaca', label: 'Red' },
  { value: '#e5e7eb', display: '#e5e7eb', label: 'Gray' },
];

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ getEditor, onMetadataPress, style, noteId, userId }) => {
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [highlightPickerVisible, setHighlightPickerVisible] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [tableBuilderVisible, setTableBuilderVisible] = useState(false);
  const [mathEquationVisible, setMathEquationVisible] = useState(false);
  const [drawingScreenVisible, setDrawingScreenVisible] = useState(false);

  // Formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const stateCheckRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const { colors, themeMode } = useTheme();
  const styles = createToolbarThemedStyles(colors, themeMode);
  const localStyles = createLocalStyles(colors, themeMode);

  const checkFormattingState = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const editor = getEditor();
    if (!editor || !editor.webviewBridge) return;

    try {
      const callbackName = `__fmt_${Date.now()}`;
      
      const script = `
        (function() {
          try {
            const state = {
              bold: document.queryCommandState('bold'),
              italic: document.queryCommandState('italic'),
              underline: document.queryCommandState('underline'),
              strikethrough: document.queryCommandState('strikeThrough')
            };
            window.${callbackName} = state;
            JSON.stringify(state);
          } catch (e) {
            JSON.stringify({bold: false, italic: false, underline: false, strikethrough: false});
          }
        })();
      `;

      editor.webviewBridge.injectJavaScript(script);
      
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        const currentEditor = getEditor();
        if (!currentEditor || !currentEditor.webviewBridge) return;
        
        currentEditor.webviewBridge.injectJavaScript(`
          (function() {
            if (window.${callbackName}) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: '__formatting__',
                ...window.${callbackName}
              }));
              delete window.${callbackName};
            }
          })();
          true;
        `);
      }, 100);
    } catch (error) {
      console.error('Error checking formatting state:', error);
    }
  }, [getEditor]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const startPolling = () => {
      if (stateCheckRef.current) {
        clearInterval(stateCheckRef.current);
      }
      
      stateCheckRef.current = setInterval(() => {
        checkFormattingState();
      }, 300);
    };

    startPolling();

    return () => {
      isMountedRef.current = false;
      if (stateCheckRef.current) {
        clearInterval(stateCheckRef.current);
        stateCheckRef.current = undefined;
      }
    };
  }, [checkFormattingState]);

  useEffect(() => {
    const editor = getEditor();
    if (!editor) return;

    const originalHandler = editor.onMessage;
    
    editor.onMessage = (event: any) => {
      try {
        const data = typeof event === 'string' ? JSON.parse(event) : JSON.parse(event?.nativeEvent?.data || event?.data || '{}');
        
        if (data.type === '__formatting__' && isMountedRef.current) {
          setIsBold(!!data.bold);
          setIsItalic(!!data.italic);
          setIsUnderline(!!data.underline);
          setIsStrikethrough(!!data.strikethrough);
        }
      } catch (e) {
        // Ignore
      }
      
      if (originalHandler && typeof originalHandler === 'function') {
        originalHandler(event);
      }
    };

    return () => {
      editor.onMessage = originalHandler;
    };
  }, [getEditor]);

  const handleBold = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('bold', false, null);
          } catch (e) {
            console.error('Bold error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  const handleItalic = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('italic', false, null);
          } catch (e) {
            console.error('Italic error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  const handleUnderline = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('underline', false, null);
          } catch (e) {
            console.error('Underline error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  const handleStrikethrough = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('strikeThrough', false, null);
          } catch (e) {
            console.error('Strikethrough error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  const handleUndo = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('undo', false, null);
          } catch (e) {
            console.error('Undo error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  const handleRedo = useCallback(() => {
    const editor = getEditor();
    if (editor && editor.webviewBridge) {
      editor.webviewBridge.injectJavaScript(`
        (function() {
          try {
            document.execCommand('redo', false, null);
          } catch (e) {
            console.error('Redo error:', e);
          }
        })();
        true;
      `);
      setTimeout(() => checkFormattingState(), 100);
    }
  }, [getEditor, checkFormattingState]);

  // NEW: Handle keyboard button press
  const handleKeyboardPress = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      // Try multiple methods to focus and bring up keyboard
      if (editor.webviewBridge) {
        editor.webviewBridge.injectJavaScript(`
          (function() {
            try {
              var editor = document.getElementById('editor') || document.querySelector('[contenteditable="true"]');
              if (editor) {
                // Force focus with click simulation
                editor.focus();
                
                // Try to place cursor at the end
                var range = document.createRange();
                var sel = window.getSelection();
                
                if (editor.childNodes.length > 0) {
                  var lastNode = editor.childNodes[editor.childNodes.length - 1];
                  range.setStartAfter(lastNode);
                  range.collapse(true);
                } else {
                  range.selectNodeContents(editor);
                  range.collapse(false);
                }
                
                sel.removeAllRanges();
                sel.addRange(range);
                
                // Trigger input event to ensure keyboard shows
                editor.dispatchEvent(new Event('touchstart', { bubbles: true }));
                editor.dispatchEvent(new Event('focus', { bubbles: true }));
              }
            } catch (e) {
              console.error('Focus error:', e);
            }
          })();
          true;
        `);
      }
      
      // Also try the editor's built-in focus method if available
      if (typeof editor.focusContentEditor === 'function') {
        setTimeout(() => editor.focusContentEditor(), 100);
      }
    }
  }, [getEditor]);

  const handleColorSelect = useCallback((colorObj: typeof COLORS[0]) => {
    const editor = getEditor();
    if (editor) {
      editor.setForeColor(colorObj.value);
    }
    setColorPickerVisible(false);
  }, [getEditor]);

  const handleHighlightSelect = useCallback((colorObj: typeof HIGHLIGHT_COLORS[0]) => {
    const editor = getEditor();
    if (editor) {
      editor.setHiliteColor(colorObj.value);
    }
    setHighlightPickerVisible(false);
  }, [getEditor]);

  const handleImageUpload = useCallback(async (source: 'gallery' | 'camera') => {
    setImagePickerVisible(false);
    setUploadingImage(true);

    try {
      const image = source === 'gallery' 
        ? await pickImage() 
        : await takePhoto();

      if (!image) {
        setUploadingImage(false);
        return;
      }

      const uploadResult = await uploadNoteImage(noteId, image.uri, userId);

      const editor = getEditor();
      if (editor) {
        editor.insertImage(uploadResult.url, `Image: ${uploadResult.fileName}`);
      }

      alert('Success! Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error! Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [getEditor, noteId, userId]);

  const handleDrawingComplete = useCallback(async (imageUri: string) => {
    setDrawingScreenVisible(false);
    setUploadingImage(true);

    try {
      const uploadResult = await uploadNoteImage(noteId, imageUri, userId);

      const editor = getEditor();
      if (editor) {
        editor.insertImage(uploadResult.url, 'Hand-drawn image');
      }

      alert('Success! Drawing inserted successfully!');
    } catch (error) {
      console.error('Error uploading drawing:', error);
      alert('Error! Failed to insert drawing. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [getEditor, noteId, userId]);

  const handleInsertTable = useCallback((html: string) => {
    const editor = getEditor();
    if (editor) {
      editor.insertHTML(html);
    }
  }, [getEditor]);

  const handleInsertEquation = useCallback((html: string) => {
    const editor = getEditor();
    if (editor) {
      editor.insertHTML(html);
    }
  }, [getEditor]);

  const handleInsertLink = useCallback(() => {
    if (linkUrl && linkText) {
      const editor = getEditor();
      if (editor) {
        editor.insertLink(linkText, linkUrl);
      }
      setLinkUrl('');
      setLinkText('');
      setLinkModalVisible(false);
    }
  }, [getEditor, linkUrl, linkText]);

  return (
    <>
      <View style={[localStyles.toolbarWrapper, style]}>
        <View style={[styles.toolbarContainer, localStyles.toolbarContainer]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}
          >
            {/* Undo/Redo */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={handleUndo}
            >
              <Ionicons name="arrow-undo" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={handleRedo}
            >
              <Ionicons name="arrow-redo" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Text formatting with active states */}
            <TouchableOpacity 
              style={[styles.customButton, isBold && styles.activeButton]}
              onPress={handleBold}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.formatText,
                { fontWeight: 'bold' },
                isBold && styles.activeText
              ]}>B</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.customButton, isItalic && styles.activeButton]}
              onPress={handleItalic}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.formatText,
                { fontStyle: 'italic' },
                isItalic && styles.activeText
              ]}>I</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.customButton, isUnderline && styles.activeButton]}
              onPress={handleUnderline}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.formatText,
                { textDecorationLine: 'underline' },
                isUnderline && styles.activeText
              ]}>U</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.customButton, isStrikethrough && styles.activeButton]}
              onPress={handleStrikethrough}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.formatText,
                { textDecorationLine: 'line-through' },
                isStrikethrough && styles.activeText
              ]}>S</Text>
            </TouchableOpacity>

            {/* Color and highlight */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setColorPickerVisible(true)}
            >
              <Ionicons name="color-palette" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setHighlightPickerVisible(true)}
            >
              <Ionicons name="color-fill" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Headings */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor) {
                  editor.sendAction(actions.heading1, 'result');
                }
              }}
            >
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>H1</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor) {
                  editor.sendAction(actions.heading2, 'result');
                }
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>H2</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor) {
                  editor.sendAction(actions.heading3, 'result');
                }
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>H3</Text>
            </TouchableOpacity>

            {/* Normal paragraph button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor && editor.webviewBridge) {
                  editor.webviewBridge.injectJavaScript(`
                    document.execCommand('formatBlock', false, '<p>');
                    true;
                  `);
                }
              }}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Lists */}
            <RichToolbar
              getEditor={getEditor}
              actions={[
                actions.insertBulletsList,
                actions.insertOrderedList,
              ]}
              iconMap={{
                [actions.insertBulletsList]: ({ tintColor }) => <Ionicons name="list" size={20} color={tintColor} />,
                [actions.insertOrderedList]: ({ tintColor }) => <Ionicons name="list-outline" size={20} color={tintColor} />,
              }}
              selectedButtonStyle={styles.selectedButton}
              iconTint={colors.text}
              selectedIconTint="#60a5fa"
              disabledIconTint="#6b7280"
              style={styles.richToolbar}
            />

            {/* Other formatting */}
            <RichToolbar
              getEditor={getEditor}
              actions={[
                actions.blockquote,
                actions.alignLeft,
                actions.alignCenter,
                actions.alignRight,
                actions.code,
                actions.line,
              ]}
              iconMap={{
                [actions.blockquote]: ({ tintColor }) => <Ionicons name="chatbox-ellipses-outline" size={20} color={tintColor} />,
                [actions.alignLeft]: ({ tintColor }) => <Ionicons name="text-outline" size={20} color={tintColor} />,
                [actions.alignCenter]: ({ tintColor }) => <Ionicons name="text" size={20} color={tintColor} />,
                [actions.alignRight]: ({ tintColor }) => <Ionicons name="text-outline" size={20} color={tintColor} style={{ transform: [{ scaleX: -1 }] }} />,
                [actions.code]: ({ tintColor }) => <Ionicons name="code-slash" size={20} color={tintColor} />,
                [actions.line]: ({ tintColor }) => <Ionicons name="remove" size={20} color={tintColor} />,
              }}
              selectedButtonStyle={styles.selectedButton}
              iconTint={colors.text}
              selectedIconTint="#60a5fa"
              disabledIconTint="#6b7280"
              style={styles.richToolbar}
            />

            {/* Link button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setLinkModalVisible(true)}
            >
              <Ionicons name="link" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Image upload button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setImagePickerVisible(true)}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="image" size={20} color={colors.text} />
              )}
            </TouchableOpacity>

            {/* Drawing button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setDrawingScreenVisible(true)}
            >
              <Ionicons name="brush-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Table button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setTableBuilderVisible(true)}
            >
              <Ionicons name="grid-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Math equation button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setMathEquationVisible(true)}
            >
              <Ionicons name="calculator-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Info button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={onMetadataPress}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Add padding at the end to prevent last items from being hidden by keyboard button */}
            <View style={localStyles.scrollEndPadding} />
          </ScrollView>

          {/* Fixed Keyboard Button - Notion style */}
          <View style={localStyles.keyboardButtonContainer}>
            <TouchableOpacity 
              style={localStyles.keyboardButton}
              onPress={handleKeyboardPress}
              activeOpacity={0.7}
            >
              <Ionicons name="keypad" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* All modals remain the same... */}
      {/* Color Picker Modal */}
      <Modal
        visible={colorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setColorPickerVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.colorPickerContainer}>
              <Text style={styles.colorPickerTitle}>Text Color</Text>
              <Text style={styles.colorPickerSubtitle}>Select text first, then choose a color</Text>
              <View style={styles.colorGridContainer}>
                <View style={styles.colorGrid}>
                  {COLORS.map((colorObj) => (
                    <TouchableOpacity
                      key={`text-${colorObj.value}`}
                      style={[
                        styles.colorSwatch, 
                        { backgroundColor: colorObj.display },
                      ]}
                      onPress={() => handleColorSelect(colorObj)}
                    >
                      {colorObj.value === '#ffffff' && (
                        <View style={styles.whiteBorder} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setColorPickerVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Highlight Picker Modal */}
      <Modal
        visible={highlightPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHighlightPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setHighlightPickerVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.colorPickerContainer}>
              <Text style={styles.colorPickerTitle}>Highlight Color</Text>
              <Text style={styles.colorPickerSubtitle}>Select text first, then choose a color</Text>
              <View style={styles.colorGridContainer}>
                <View style={styles.colorGrid}>
                  {HIGHLIGHT_COLORS.map((colorObj) => (
                    <TouchableOpacity
                      key={`highlight-${colorObj.value}`}
                      style={[
                        styles.colorSwatch, 
                        { backgroundColor: colorObj.display },
                      ]}
                      onPress={() => handleHighlightSelect(colorObj)}
                    />
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setHighlightPickerVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Link Modal */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLinkModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.linkModalContainer}>
              <Text style={styles.linkModalTitle}>Insert Link</Text>
              
              <TextInput
                style={styles.linkInput}
                placeholder="Link text"
                placeholderTextColor={colors.textSecondary}
                value={linkText}
                onChangeText={setLinkText}
              />
              
              <TextInput
                style={styles.linkInput}
                placeholder="URL (e.g., https://example.com)"
                placeholderTextColor={colors.textSecondary}
                value={linkUrl}
                onChangeText={setLinkUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
              
              <View style={styles.linkModalButtons}>
                <TouchableOpacity
                  style={[styles.linkModalButton, styles.linkModalButtonCancel]}
                  onPress={() => {
                    setLinkModalVisible(false);
                    setLinkUrl('');
                    setLinkText('');
                  }}
                >
                  <Text style={styles.linkModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.linkModalButton, styles.linkModalButtonInsert]}
                  onPress={handleInsertLink}
                  disabled={!linkUrl || !linkText}
                >
                  <Text style={[
                    styles.linkModalButtonText,
                    (!linkUrl || !linkText) && { opacity: 0.5 }
                  ]}>Insert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImagePickerVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.imagePickerContainer}>
              <Text style={styles.imagePickerTitle}>Insert Image</Text>
              
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => handleImageUpload('gallery')}
              >
                <Ionicons name="images" size={24} color={colors.primary} />
                <Text style={styles.imagePickerButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => handleImageUpload('camera')}
              >
                <Ionicons name="camera" size={24} color={colors.primary} />
                <Text style={styles.imagePickerButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.imagePickerButton, styles.imagePickerButtonCancel]}
                onPress={() => setImagePickerVisible(false)}
              >
                <Ionicons name="close" size={24} color="#ef4444" />
                <Text style={[styles.imagePickerButtonText, { color: '#ef4444' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Table Builder Modal */}
      <TableBuilder
        visible={tableBuilderVisible}
        onClose={() => setTableBuilderVisible(false)}
        onInsert={handleInsertTable}
      />

      {/* Math Equation Builder Modal */}
      <MathEquationBuilder
        visible={mathEquationVisible}
        onClose={() => setMathEquationVisible(false)}
        onInsert={handleInsertEquation}
      />

      {/* Drawing Screen Modal */}
      <Modal
        visible={drawingScreenVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setDrawingScreenVisible(false)}
      >
        <DrawingScreen
          onComplete={handleDrawingComplete}
          onCancel={() => setDrawingScreenVisible(false)}
        />
      </Modal>
    </>
  );
};

const createLocalStyles = (colors: ThemeColors, themeMode: ThemeMode) => StyleSheet.create({
  toolbarWrapper: {
    position: 'relative',
  },
  toolbarContainer: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingRight: 60, // Make room for the fixed keyboard button
  },
  scrollEndPadding: {
    width: 20, // Additional padding at the end
  },
  keyboardButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
    paddingLeft: 20,
    // Gradient fade effect using shadow
    shadowColor: themeMode === 'light' ? colors.surface : colors.toolbarBackground,
    shadowOffset: {
      width: -15,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
    // Background with slight gradient effect
    backgroundColor: colors.toolbarBackground,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
  },
  keyboardButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: themeMode === 'light' ? colors.text : 'rgba(255, 255, 255, 0.3)',
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 40,
    paddingVertical: 1,
    maxHeight: 60,
    marginHorizontal: 5,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  richToolbar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    minHeight: 50,
    flexDirection: 'row',
  },
  selectedButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 6,
  },
  customButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 6,
    position: 'relative',
  },
  activeButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  formatText: {
    color: '#ffffff',
    fontSize: 18,
  },
  activeText: {
    color: '#60a5fa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: 320,
    maxHeight: 500,
  },
  colorPickerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  colorPickerSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  colorGridContainer: {
    maxHeight: 350,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
    margin: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteBorder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  linkModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: 320,
  },
  linkModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  linkInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  linkModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  linkModalButtonCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  linkModalButtonInsert: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  linkModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: 320,
  },
  imagePickerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  imagePickerButtonCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  imagePickerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});


export default RichTextToolbar;