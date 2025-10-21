// components/Interface/QuillToolbar.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface QuillToolbarProps {
  editorRef: React.RefObject<WebView>;
  onInfoPress?: () => void;
}

interface FormatState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  background?: string;
  header?: number | false;
  list?: 'ordered' | 'bullet' | false;
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#FFFFFF', '#FCD34D'
];

const HIGHLIGHT_COLORS = [
  'transparent', '#FEF3C7', '#DBEAFE', '#D1FAE5',
  '#FCE7F3', '#E9D5FF', '#FED7AA', '#FEE2E2'
];

export default function QuillToolbar({ editorRef, onInfoPress }: QuillToolbarProps) {
  const [formatState, setFormatState] = useState<FormatState>({});
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [highlightPickerVisible, setHighlightPickerVisible] = useState(false);

  // Execute format command
  const format = (name: string, value: any = true) => {
    const command = typeof value === 'string' 
      ? `window.quillEditor.format('${name}', '${value}');`
      : value === false || value === null
      ? `window.quillEditor.format('${name}', false);`
      : `window.quillEditor.format('${name}', ${value});`;
    
    editorRef.current?.injectJavaScript(command);
    
    // Request format state update
    requestFormatState();
  };

  // Toggle boolean formats
  const toggleFormat = (name: string) => {
    const currentValue = formatState[name as keyof FormatState];
    format(name, !currentValue);
  };

  // Request current format state from Quill
  const requestFormatState = () => {
    editorRef.current?.injectJavaScript(`
      (function() {
        const selection = window.quillEditor.getSelection();
        if (selection) {
          const formats = window.quillEditor.getFormat(selection);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'format-state',
            formats: formats
          }));
        }
      })();
    `);
  };

  // Listen for format state updates from WebView
  useEffect(() => {
    // This would need to be handled in the parent component
    // and passed down as a prop, or use a context
  }, []);

  const setHeading = (level: 1 | 2 | 3 | false) => {
    format('header', level);
  };

  const setList = (type: 'ordered' | 'bullet' | false) => {
    format('list', type);
  };

  const setColor = (color: string) => {
    format('color', color);
    setColorPickerVisible(false);
  };

  const setBackground = (color: string) => {
    format('background', color === 'transparent' ? false : color);
    setHighlightPickerVisible(false);
  };

  const insertDivider = () => {
    editorRef.current?.injectJavaScript(`
      const selection = window.quillEditor.getSelection();
      if (selection) {
        window.quillEditor.insertText(selection.index, '\\n---\\n');
      }
    `);
  };

  const isFormatActive = (format: keyof FormatState): boolean => {
    return !!formatState[format];
  };

  return (
    <>
      <View style={styles.toolbar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarContent}
        >
          {/* Bold */}
          <TouchableOpacity
            style={[styles.toolbarButton, isFormatActive('bold') && styles.activeButton]}
            onPress={() => toggleFormat('bold')}
          >
            <Text style={[styles.toolbarButtonText, styles.boldText]}>B</Text>
          </TouchableOpacity>

          {/* Italic */}
          <TouchableOpacity
            style={[styles.toolbarButton, isFormatActive('italic') && styles.activeButton]}
            onPress={() => toggleFormat('italic')}
          >
            <Text style={[styles.toolbarButtonText, styles.italicText]}>I</Text>
          </TouchableOpacity>

          {/* Underline */}
          <TouchableOpacity
            style={[styles.toolbarButton, isFormatActive('underline') && styles.activeButton]}
            onPress={() => toggleFormat('underline')}
          >
            <Text style={[styles.toolbarButtonText, styles.underlineText]}>U</Text>
          </TouchableOpacity>

          {/* Strikethrough */}
          <TouchableOpacity
            style={[styles.toolbarButton, isFormatActive('strike') && styles.activeButton]}
            onPress={() => toggleFormat('strike')}
          >
            <Text style={[styles.toolbarButtonText, styles.strikethroughText]}>S</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Text Color */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setColorPickerVisible(true)}
          >
            <Ionicons name="color-palette-outline" size={20} color="#fff" />
            {formatState.color && (
              <View 
                style={[styles.colorIndicator, { backgroundColor: formatState.color }]} 
              />
            )}
          </TouchableOpacity>

          {/* Highlight */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setHighlightPickerVisible(true)}
          >
            <Ionicons name="color-fill-outline" size={20} color="#fff" />
            {formatState.background && (
              <View 
                style={[styles.colorIndicator, { backgroundColor: formatState.background }]} 
              />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Heading 1 */}
          <TouchableOpacity
            style={[styles.toolbarButton, formatState.header === 1 && styles.activeButton]}
            onPress={() => setHeading(formatState.header === 1 ? false : 1)}
          >
            <Text style={styles.toolbarButtonText}>H1</Text>
          </TouchableOpacity>

          {/* Heading 2 */}
          <TouchableOpacity
            style={[styles.toolbarButton, formatState.header === 2 && styles.activeButton]}
            onPress={() => setHeading(formatState.header === 2 ? false : 2)}
          >
            <Text style={styles.toolbarButtonText}>H2</Text>
          </TouchableOpacity>

          {/* Heading 3 */}
          <TouchableOpacity
            style={[styles.toolbarButton, formatState.header === 3 && styles.activeButton]}
            onPress={() => setHeading(formatState.header === 3 ? false : 3)}
          >
            <Text style={styles.toolbarButtonText}>H3</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Bullet List */}
          <TouchableOpacity
            style={[styles.toolbarButton, formatState.list === 'bullet' && styles.activeButton]}
            onPress={() => setList(formatState.list === 'bullet' ? false : 'bullet')}
          >
            <Ionicons name="list" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Numbered List */}
          <TouchableOpacity
            style={[styles.toolbarButton, formatState.list === 'ordered' && styles.activeButton]}
            onPress={() => setList(formatState.list === 'ordered' ? false : 'ordered')}
          >
            <Ionicons name="list-outline" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Horizontal Divider */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={insertDivider}
          >
            <Ionicons name="remove-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Clear Formatting */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => {
              editorRef.current?.injectJavaScript(`
                const selection = window.quillEditor.getSelection();
                if (selection && selection.length > 0) {
                  window.quillEditor.removeFormat(selection.index, selection.length);
                }
              `);
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Info Button */}
          {onInfoPress && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={[styles.toolbarButton, styles.infoButton]}
                onPress={onInfoPress}
              >
                <Ionicons name="information-circle-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          )}
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
          <View style={styles.colorPickerModal}>
            <Text style={styles.colorPickerTitle}>Text Color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    color === formatState.color && styles.selectedColor
                  ]}
                  onPress={() => setColor(color)}
                >
                  {color === formatState.color && (
                    <Ionicons name="checkmark" size={20} color={color === '#FFFFFF' ? '#000' : '#fff'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
          <View style={styles.colorPickerModal}>
            <Text style={styles.colorPickerTitle}>Highlight Color</Text>
            <View style={styles.colorGrid}>
              {HIGHLIGHT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    color === 'transparent' && styles.transparentOption,
                    color === formatState.background && styles.selectedColor
                  ]}
                  onPress={() => setBackground(color)}
                >
                  {color === 'transparent' && (
                    <Ionicons name="close" size={20} color="#ef4444" />
                  )}
                  {color === formatState.background && color !== 'transparent' && (
                    <Ionicons name="checkmark" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
  },
  toolbarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  toolbarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '900',
  },
  italicText: {
    fontStyle: 'italic',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  colorIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  infoButton: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: Dimensions.get('window').width - 80,
    maxWidth: 320,
  },
  colorPickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedColor: {
    borderColor: '#3B82F6',
    borderWidth: 3,
  },
  transparentOption: {
    borderWidth: 2,
    borderColor: '#ef4444',
    borderStyle: 'dashed',
  },
});