// components/RichTextEditor/TableBuilder.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TableBuilderProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

const TableBuilder: React.FC<TableBuilderProps> = ({ visible, onClose, onInsert }) => {
  const [rows, setRows] = useState('3');
  const [columns, setColumns] = useState('3');
  const [hasHeader, setHasHeader] = useState(true);

  const generateTableHTML = () => {
    const numRows = parseInt(rows) || 3;
    const numCols = parseInt(columns) || 3;

    let html = `
      <table style="
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
      ">
    `;

    // Generate header row if enabled
    if (hasHeader) {
      html += '<thead><tr>';
      for (let col = 0; col < numCols; col++) {
        html += `
          <th style="
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: left;
            background-color: #f1f5f9;
            font-weight: 600;
            color: #1e293b;
          ">Header ${col + 1}</th>
        `;
      }
      html += '</tr></thead>';
    }

    // Generate body rows
    html += '<tbody>';
    for (let row = 0; row < numRows; row++) {
      html += '<tr>';
      for (let col = 0; col < numCols; col++) {
        html += `
          <td style="
            border: 1px solid #cbd5e1;
            padding: 12px;
            color: #1e293b;
          ">Cell ${row + 1},${col + 1}</td>
        `;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    html += '</table><p><br></p>';

    return html;
  };

  const handleInsert = () => {
    const tableHTML = generateTableHTML();
    onInsert(tableHTML);
    onClose();
    // Reset
    setRows('3');
    setColumns('3');
    setHasHeader(true);
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
              <Text style={styles.title}>Insert Table</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* Rows Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Rows</Text>
                <TextInput
                  style={styles.input}
                  value={rows}
                  onChangeText={setRows}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Columns Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Columns</Text>
                <TextInput
                  style={styles.input}
                  value={columns}
                  onChangeText={setColumns}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Header Toggle */}
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setHasHeader(!hasHeader)}
              >
                <View style={[styles.checkbox, hasHeader && styles.checkboxChecked]}>
                  {hasHeader && <Ionicons name="checkmark" size={18} color="#ffffff" />}
                </View>
                <Text style={styles.checkboxLabel}>Include header row</Text>
              </TouchableOpacity>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.preview}>
                  <Text style={styles.previewText}>
                    {hasHeader ? parseInt(rows) + 1 : parseInt(rows)} rows × {columns} columns
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.insertButton]}
                onPress={handleInsert}
              >
                <Text style={styles.buttonText}>Insert Table</Text>
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
    width: 340,
    maxHeight: '80%',
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
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  previewContainer: {
    marginTop: 10,
  },
  previewLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  preview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewText: {
    color: '#ffffff',
    fontSize: 14,
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

export default TableBuilder;