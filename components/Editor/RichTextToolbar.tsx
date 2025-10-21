// // components/Editor/RichTextToolbar.tsx
// import { EditorFormat } from '@/app/types/notebook';
// import { Ionicons } from '@expo/vector-icons';
// import React, { useState } from 'react';
// import {
//   Modal,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';

// interface RichTextToolbarProps {
//   onFormat: (format: string, value?: any) => void;
//   currentFormat: EditorFormat;
//   disabled?: boolean;
// }

// const COLORS = [
//   '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
//   '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
//   '#008000', '#FFC0CB', '#A52A2A', '#808080', '#FFD700',
// ];

// export default function RichTextToolbar({
//   onFormat,
//   currentFormat,
//   disabled = false,
// }: RichTextToolbarProps) {
//   const [showColorPicker, setShowColorPicker] = useState(false);
//   const [colorMode, setColorMode] = useState<'text' | 'bg'>('text');
//   const [showTableModal, setShowTableModal] = useState(false);
//   const [showMathModal, setShowMathModal] = useState(false);
//   const [tableRows, setTableRows] = useState('3');
//   const [tableCols, setTableCols] = useState('3');
//   const [mathLatex, setMathLatex] = useState('');

//   const handleColorSelect = (color: string) => {
//     onFormat(colorMode === 'text' ? 'color' : 'bgColor', color);
//     setShowColorPicker(false);
//   };

//   const handleTableInsert = () => {
//     const rows = parseInt(tableRows) || 3;
//     const cols = parseInt(tableCols) || 3;
//     onFormat('insert:table', { rows, cols });
//     setShowTableModal(false);
//     setTableRows('3');
//     setTableCols('3');
//   };

//   const handleMathInsert = () => {
//     if (mathLatex.trim()) {
//       onFormat('insert:math', { latex: mathLatex.trim() });
//       setShowMathModal(false);
//       setMathLatex('');
//     }
//   };

//   const renderButton = (
//     icon: string,
//     action: string,
//     isActive: boolean = false,
//     label?: string
//   ) => (
//     <TouchableOpacity
//       style={[
//         styles.toolbarButton,
//         isActive && styles.toolbarButtonActive,
//         disabled && styles.toolbarButtonDisabled,
//       ]}
//       onPress={() => {
//         if (action.startsWith('color:')) {
//           setColorMode(action === 'color:text' ? 'text' : 'bg');
//           setShowColorPicker(true);
//         } else if (action === 'insert:table') {
//           setShowTableModal(true);
//         } else if (action === 'insert:math') {
//           setShowMathModal(true);
//         } else {
//           onFormat(action);
//         }
//       }}
//       disabled={disabled}
//     >
//       <Ionicons
//         name={icon as any}
//         size={20}
//         color={isActive ? '#60a5fa' : disabled ? '#6b7280' : '#fff'}
//       />
//       {label && <Text style={styles.buttonLabel}>{label}</Text>}
//     </TouchableOpacity>
//   );

//   return (
//     <>
//       <View style={styles.toolbar}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.toolbarContent}
//         >
//           {/* Text Formatting */}
//           <View style={styles.toolbarGroup}>
//             {renderButton('text', 'format:bold', currentFormat.bold)}
//             {renderButton('text', 'format:italic', currentFormat.italic)}
//             <View style={styles.iconWithUnderline}>
//               {renderButton('text', 'format:underline', currentFormat.underline)}
//               {currentFormat.underline && <View style={styles.underlineMark} />}
//             </View>
//             {renderButton('remove', 'format:strikethrough', currentFormat.strikethrough)}
//           </View>

//           <View style={styles.separator} />

//           {/* Colors */}
//           <View style={styles.toolbarGroup}>
//             {renderButton('color-palette-outline', 'color:text')}
//             {renderButton('color-fill-outline', 'color:bg')}
//           </View>

//           <View style={styles.separator} />

//           {/* Headings & Lists */}
//           <View style={styles.toolbarGroup}>
//             {renderButton('text-outline', 'block:h1', false, 'H1')}
//             {renderButton('text-outline', 'block:h2', false, 'H2')}
//             {renderButton('text-outline', 'block:h3', false, 'H3')}
//             {renderButton('list', 'block:bullet')}
//             {renderButton('list-outline', 'block:numbered')}
//           </View>

//           <View style={styles.separator} />

//           {/* Insert Elements */}
//           <View style={styles.toolbarGroup}>
//             {renderButton('grid-outline', 'insert:table')}
//             {renderButton('calculator-outline', 'insert:math')}
//             {renderButton('remove-outline', 'insert:divider')}
//             {/* Future features - commented out */}
//             {/* {renderButton('image-outline', 'insert:image')} */}
//             {/* {renderButton('bar-chart-outline', 'insert:chart')} */}
//           </View>
//         </ScrollView>
//       </View>

//       {/* Color Picker Modal */}
//       <Modal
//         visible={showColorPicker}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowColorPicker(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowColorPicker(false)}
//         >
//           <View style={styles.colorPickerContainer}>
//             <Text style={styles.modalTitle}>
//               Choose {colorMode === 'text' ? 'Text' : 'Background'} Color
//             </Text>
//             <View style={styles.colorGrid}>
//               {COLORS.map((color) => (
//                 <TouchableOpacity
//                   key={color}
//                   style={[
//                     styles.colorButton,
//                     { backgroundColor: color },
//                     color === '#FFFFFF' && styles.colorButtonBorder,
//                   ]}
//                   onPress={() => handleColorSelect(color)}
//                 />
//               ))}
//             </View>
//             <TouchableOpacity
//               style={styles.modalCloseButton}
//               onPress={() => setShowColorPicker(false)}
//             >
//               <Text style={styles.modalCloseText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* Table Insert Modal */}
//       <Modal
//         visible={showTableModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowTableModal(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowTableModal(false)}
//         >
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Insert Table</Text>
//             <View style={styles.inputRow}>
//               <Text style={styles.inputLabel}>Rows:</Text>
//               <TextInput
//                 style={styles.input}
//                 value={tableRows}
//                 onChangeText={setTableRows}
//                 keyboardType="number-pad"
//                 placeholder="3"
//                 placeholderTextColor="#9ca3af"
//               />
//             </View>
//             <View style={styles.inputRow}>
//               <Text style={styles.inputLabel}>Columns:</Text>
//               <TextInput
//                 style={styles.input}
//                 value={tableCols}
//                 onChangeText={setTableCols}
//                 keyboardType="number-pad"
//                 placeholder="3"
//                 placeholderTextColor="#9ca3af"
//               />
//             </View>
//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={styles.modalButton}
//                 onPress={() => setShowTableModal(false)}
//               >
//                 <Text style={styles.modalButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.modalButtonPrimary]}
//                 onPress={handleTableInsert}
//               >
//                 <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
//                   Insert
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* Math Insert Modal */}
//       <Modal
//         visible={showMathModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowMathModal(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowMathModal(false)}
//         >
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Insert Math Equation</Text>
//             <Text style={styles.modalSubtitle}>Enter LaTeX code:</Text>
//             <TextInput
//               style={[styles.input, styles.mathInput]}
//               value={mathLatex}
//               onChangeText={setMathLatex}
//               placeholder="e.g., x^2 + y^2 = r^2"
//               placeholderTextColor="#9ca3af"
//               multiline
//               autoFocus
//             />
//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={styles.modalButton}
//                 onPress={() => setShowMathModal(false)}
//               >
//                 <Text style={styles.modalButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.modalButtonPrimary]}
//                 onPress={handleMathInsert}
//               >
//                 <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
//                   Insert
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   toolbar: {
//     backgroundColor: 'rgba(50, 71, 98, 0.95)',
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(255, 255, 255, 0.1)',
//     paddingVertical: 8,
//   },
//   toolbarContent: {
//     paddingHorizontal: 8,
//     alignItems: 'center',
//   },
//   toolbarGroup: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   toolbarButton: {
//     padding: 10,
//     borderRadius: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     minWidth: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   toolbarButtonActive: {
//     backgroundColor: 'rgba(96, 165, 250, 0.3)',
//   },
//   toolbarButtonDisabled: {
//     opacity: 0.5,
//   },
//   buttonLabel: {
//     color: '#fff',
//     fontSize: 10,
//     marginTop: 2,
//     fontWeight: '600',
//   },
//   iconWithUnderline: {
//     position: 'relative',
//   },
//   underlineMark: {
//     position: 'absolute',
//     bottom: 8,
//     left: 10,
//     right: 10,
//     height: 2,
//     backgroundColor: '#60a5fa',
//   },
//   separator: {
//     width: 1,
//     height: 30,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     marginHorizontal: 8,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     backgroundColor: '#1f2937',
//     borderRadius: 16,
//     padding: 24,
//     width: '85%',
//     maxWidth: 400,
//   },
//   colorPickerContainer: {
//     backgroundColor: '#1f2937',
//     borderRadius: 16,
//     padding: 24,
//     width: '85%',
//     maxWidth: 350,
//   },
//   modalTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   modalSubtitle: {
//     color: '#9ca3af',
//     fontSize: 14,
//     marginBottom: 12,
//   },
//   colorGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//     justifyContent: 'center',
//     marginBottom: 16,
//   },
//   colorButton: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   colorButtonBorder: {
//     borderWidth: 2,
//     borderColor: '#4b5563',
//   },
//   inputRow: {
//     marginBottom: 16,
//   },
//   inputLabel: {
//     color: '#9ca3af',
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 8,
//     padding: 12,
//     color: '#fff',
//     fontSize: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//   },
//   mathInput: {
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 8,
//   },
//   modalButton: {
//     flex: 1,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   modalButtonPrimary: {
//     backgroundColor: '#60a5fa',
//   },
//   modalButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   modalButtonTextPrimary: {
//     color: '#fff',
//   },
//   modalCloseButton: {
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   modalCloseText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });