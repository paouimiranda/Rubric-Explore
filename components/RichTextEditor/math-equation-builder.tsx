// components/RichTextEditor/MathEquationBuilder.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MathEquationBuilderProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

// Common math symbols and templates
const MATH_SYMBOLS = [
  { label: '∑', value: '∑' },
  { label: '∫', value: '∫' },
  { label: '√', value: '√' },
  { label: '∞', value: '∞' },
  { label: '≈', value: '≈' },
  { label: '≠', value: '≠' },
  { label: '≤', value: '≤' },
  { label: '≥', value: '≥' },
  { label: 'π', value: 'π' },
  { label: 'α', value: 'α' },
  { label: 'β', value: 'β' },
  { label: 'θ', value: 'θ' },
  { label: '±', value: '±' },
  { label: '×', value: '×' },
  { label: '÷', value: '÷' },
  { label: '°', value: '°' },
];

const TEMPLATES = [
  { label: 'Fraction', value: 'a/b', display: 'a/b' },
  { label: 'Exponent', value: 'x²', display: 'x²' },
  { label: 'Square Root', value: '√x', display: '√x' },
  { label: 'Subscript', value: 'xₙ', display: 'xₙ' },
];

const MathEquationBuilder: React.FC<MathEquationBuilderProps> = ({ visible, onClose, onInsert }) => {
  const [equation, setEquation] = useState('');
  const [displayMode, setDisplayMode] = useState<'inline' | 'block'>('block');

  const insertSymbol = (symbol: string) => {
    setEquation(prev => prev + symbol);
  };

  const generateEquationHTML = () => {
    if (!equation.trim()) {
      Alert.alert('Error', 'Please enter an equation');
      return null;
    }

    const containerStyle = displayMode === 'block'
      ? `
        display: block;
        text-align: center;
        margin: 16px auto;
        padding: 16px;
        background-color: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        max-width: 90%;
      `
      : `
        display: inline-block;
        padding: 4px 8px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        margin: 0 4px;
      `;

    const html = `
      <div style="${containerStyle}">
        <span style="
          font-family: 'Cambria Math', 'Times New Roman', serif;
          font-size: ${displayMode === 'block' ? '20px' : '16px'};
          color: #1e293b;
          letter-spacing: 0.5px;
        ">${equation}</span>
      </div>
      ${displayMode === 'block' ? '<p><br></p>' : ''}
    `;

    return html;
  };

  const handleInsert = () => {
    const html = generateEquationHTML();
    if (html) {
      onInsert(html);
      setEquation('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Insert Equation</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* Equation Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Equation</Text>
                <TextInput
                  style={styles.input}
                  value={equation}
                  onChangeText={setEquation}
                  placeholder="Enter your equation..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.hint}>
                  Tip: Use ^ for exponents (x^2), _ for subscripts (x_n)
                </Text>
              </View>

              {/* Display Mode Toggle */}
              <View style={styles.toggleGroup}>
                <Text style={styles.label}>Display Mode</Text>
                <View style={styles.toggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      displayMode === 'inline' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDisplayMode('inline')}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      displayMode === 'inline' && styles.toggleButtonTextActive
                    ]}>Inline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      displayMode === 'block' && styles.toggleButtonActive
                    ]}
                    onPress={() => setDisplayMode('block')}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      displayMode === 'block' && styles.toggleButtonTextActive
                    ]}>Block</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Math Symbols */}
              <View style={styles.symbolsSection}>
                <Text style={styles.label}>Common Symbols</Text>
                <View style={styles.symbolsGrid}>
                  {MATH_SYMBOLS.map((symbol, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.symbolButton}
                      onPress={() => insertSymbol(symbol.value)}
                    >
                      <Text style={styles.symbolText}>{symbol.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Templates */}
              <View style={styles.templatesSection}>
                <Text style={styles.label}>Templates</Text>
                <View style={styles.templatesGrid}>
                  {TEMPLATES.map((template, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.templateButton}
                      onPress={() => insertSymbol(template.value)}
                    >
                      <Text style={styles.templateText}>{template.display}</Text>
                      <Text style={styles.templateLabel}>{template.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              {equation && (
                <View style={styles.previewContainer}>
                  <Text style={styles.label}>Preview</Text>
                  <View style={styles.preview}>
                    <Text style={styles.previewText}>{equation}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEquation('');
                  onClose();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.insertButton]}
                onPress={handleInsert}
                disabled={!equation.trim()}
              >
                <Text style={[
                  styles.buttonText,
                  !equation.trim() && { opacity: 0.5 }
                ]}>Insert Equation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    width: 360,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  toggleGroup: {
    marginBottom: 20,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  toggleButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  symbolsSection: {
    marginBottom: 20,
  },
  symbolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symbolButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  symbolText: {
    color: '#ffffff',
    fontSize: 20,
  },
  templatesSection: {
    marginBottom: 20,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 70,
    alignItems: 'center',
  },
  templateText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 4,
  },
  templateLabel: {
    color: '#9ca3af',
    fontSize: 10,
  },
  previewContainer: {
    marginTop: 10,
  },
  preview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  previewText: {
    color: '#1e293b',
    fontSize: 18,
    fontFamily: 'serif',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  insertButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MathEquationBuilder;