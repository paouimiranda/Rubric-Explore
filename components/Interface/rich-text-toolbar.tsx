  // components/RichTextEditor/RichTextToolbar.tsx
  import { pickImage, takePhoto, uploadNoteImage } from '@/services/image-service';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { RichToolbar, actions } from 'react-native-pell-rich-editor';
import MathEquationBuilder from '../RichTextEditor/math-equation-builder';
import TableBuilder from '../RichTextEditor/table-builder';

  interface RichTextToolbarProps {
    getEditor: () => any;
    onMetadataPress: () => void;
    noteId: string; // Inadd for image
    userId: string; //Inadd for image
    style?: any;
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
      // Pick or take image
      const image = source === 'gallery' 
        ? await pickImage() 
        : await takePhoto();

      if (!image) {
        setUploadingImage(false);
        return;
      }

      // Upload to Firebase Storage
      const uploadResult = await uploadNoteImage(noteId, image.uri, userId);

      // Insert image into editor
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
        <View style={[styles.toolbarContainer, style]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Standard RichToolbar for built-in actions */}
            <RichToolbar
              getEditor={getEditor}
              actions={[
                actions.undo,
                actions.redo,
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.setStrikethrough,
              ]}
              iconMap={{
                [actions.undo]: ({ tintColor }) => <Ionicons name="arrow-undo" size={20} color={tintColor} />,
                [actions.redo]: ({ tintColor }) => <Ionicons name="arrow-redo" size={20} color={tintColor} />,
                [actions.setBold]: ({ tintColor }) => <Text style={{ color: tintColor, fontWeight: 'bold', fontSize: 18 }}>B</Text>,
                [actions.setItalic]: ({ tintColor }) => <Text style={{ color: tintColor, fontStyle: 'italic', fontSize: 18 }}>I</Text>,
                [actions.setUnderline]: ({ tintColor }) => <Text style={{ color: tintColor, textDecorationLine: 'underline', fontSize: 18 }}>U</Text>,
                [actions.setStrikethrough]: ({ tintColor }) => <Text style={{ color: tintColor, textDecorationLine: 'line-through', fontSize: 18 }}>S</Text>,
              }}
              selectedButtonStyle={styles.selectedButton}
              iconTint="#ffffff"
              selectedIconTint="#60a5fa"
              disabledIconTint="#6b7280"
              style={styles.richToolbar}
            />

            {/* Custom buttons for color and highlight */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setColorPickerVisible(true)}
            >
              <Ionicons name="color-palette" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setHighlightPickerVisible(true)}
            >
              <Ionicons name="color-fill" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Custom heading buttons with toggle capability */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor) {
                  // Use sendAction to execute the heading1 action
                  editor.sendAction(actions.heading1, 'result');
                }
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>H1</Text>
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
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>H2</Text>
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
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>H3</Text>
            </TouchableOpacity>

            {/* Normal paragraph button to remove heading */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => {
                const editor = getEditor();
                if (editor && editor.webviewBridge) {
                  // Use injectJavaScript to execute formatBlock command
                  editor.webviewBridge.injectJavaScript(`
                    document.execCommand('formatBlock', false, '<p>');
                    true;
                  `);
                }
              }}
            >
              <Ionicons name="document-text-outline" size={20} color="#ffffff" />
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
              iconTint="#ffffff"
              selectedIconTint="#60a5fa"
              disabledIconTint="#6b7280"
              style={styles.richToolbar}
            />

            {/* Third row of standard actions */}
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
              iconTint="#ffffff"
              selectedIconTint="#60a5fa"
              disabledIconTint="#6b7280"
              style={styles.richToolbar}
            />

            {/* Custom link and info buttons */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setLinkModalVisible(true)}
            >
              <Ionicons name="link" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Image upload button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setImagePickerVisible(true)}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="image" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
            {/* Table button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setTableBuilderVisible(true)}
            >
              <Ionicons name="grid-outline" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Math equation button */}
            <TouchableOpacity 
              style={styles.customButton}
              onPress={() => setMathEquationVisible(true)}
            >
              <Ionicons name="calculator-outline" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.customButton}
              onPress={onMetadataPress}
            >
              <Ionicons name="information-circle-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </ScrollView>
        </View>

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
                  placeholderTextColor="#9ca3af"
                  value={linkText}
                  onChangeText={setLinkText}
                />
                
                <TextInput
                  style={styles.linkInput}
                  placeholder="URL (e.g., https://example.com)"
                  placeholderTextColor="#9ca3af"
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
                  <Ionicons name="images" size={24} color="#60a5fa" />
                  <Text style={styles.imagePickerButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={() => handleImageUpload('camera')}
                >
                  <Ionicons name="camera" size={24} color="#60a5fa" />
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
      </>
    );
  };

  const styles = StyleSheet.create({
    toolbarContainer: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
      paddingVertical: 4,
      maxHeight: 60,
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
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 4,
      borderRadius: 6,
      position: 'relative',
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