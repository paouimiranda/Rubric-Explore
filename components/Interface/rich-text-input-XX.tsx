// // components/Interface/RichTextInput.tsx - SIMPLIFIED APPROACH
// import { RichTextSegment } from '@/hooks/useRichTextEditor';
// import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
// import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

// interface RichTextInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
//   segments: RichTextSegment[];
//   onTextChange: (text: string, selectionStart: number, selectionEnd: number) => void;
//   onSelectionRangeChange?: (start: number, end: number) => void;
// }

// export interface RichTextInputHandle {
//   focus: () => void;
//   blur: () => void;
// }

// const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(({
//   segments,
//   onTextChange,
//   onSelectionRangeChange,
//   style,
//   placeholder,
//   placeholderTextColor = '#9ca3af',
//   ...props
// }, ref) => {
//   const inputRef = useRef<TextInput>(null);
//   const [selection, setSelection] = useState({ start: 0, end: 0 });
//   const [isFocused, setIsFocused] = useState(false);
  
//   const lastSentValue = useRef('');
//   const isUpdatingFromParent = useRef(false);

//   useImperativeHandle(ref, () => ({
//     focus: () => inputRef.current?.focus(),
//     blur: () => inputRef.current?.blur(),
//   }));

//   const plainText = segments.map(s => s.text).join('');

//   useEffect(() => {
//     if (plainText !== lastSentValue.current) {
//       isUpdatingFromParent.current = true;
//       setTimeout(() => {
//         isUpdatingFromParent.current = false;
//       }, 50);
//     }
//   }, [plainText]);

//   const handleChangeText = (text: string) => {
//     if (isUpdatingFromParent.current) return;
//     lastSentValue.current = text;
//     onTextChange(text, selection.start, selection.end);
//   };

//   const handleSelectionChange = (event: any) => {
//     const { start, end } = event.nativeEvent.selection;
//     if (start !== selection.start || end !== selection.end) {
//       setSelection({ start, end });
//       onSelectionRangeChange?.(start, end);
//     }
//   };

//   const getTextStyle = (segment: RichTextSegment, isSelected: boolean) => {
//     const textStyle: any = {
//       fontSize: 16,
//       lineHeight: 24,
//       color: segment.formats.color || '#1f2937',
//     };

//     if (isSelected) {
//       textStyle.backgroundColor = Platform.OS === 'ios' 
//         ? 'rgba(0, 122, 255, 0.3)' 
//         : 'rgba(59, 130, 246, 0.3)';
//     } else if (segment.formats.backgroundColor && segment.formats.backgroundColor !== 'transparent') {
//       textStyle.backgroundColor = segment.formats.backgroundColor;
//       textStyle.paddingHorizontal = 2;
//     }

//     if (segment.formats.bold) textStyle.fontWeight = 'bold';
//     if (segment.formats.italic) textStyle.fontStyle = 'italic';

//     const decorations: string[] = [];
//     if (segment.formats.underline) decorations.push('underline');
//     if (segment.formats.strikethrough) decorations.push('line-through');
//     if (decorations.length > 0) {
//       textStyle.textDecorationLine = decorations.join(' ');
//     }

//     if (segment.formats.heading === 'h1') {
//       textStyle.fontSize = 32;
//       textStyle.fontWeight = 'bold';
//       textStyle.lineHeight = 40;
//       textStyle.marginVertical = 8;
//     } else if (segment.formats.heading === 'h2') {
//       textStyle.fontSize = 24;
//       textStyle.fontWeight = 'bold';
//       textStyle.lineHeight = 32;
//       textStyle.marginVertical = 6;
//     } else if (segment.formats.heading === 'h3') {
//       textStyle.fontSize = 20;
//       textStyle.fontWeight = '600';
//       textStyle.lineHeight = 28;
//       textStyle.marginVertical = 4;
//     }

//     return textStyle;
//   };

//   const getPrefix = (segment: RichTextSegment): string => {
//     if (segment.formats.listType === 'bullet') return '• ';
//     if (segment.formats.listType === 'numbered') return '1. ';
//     return '';
//   };

//   const renderFormattedText = () => {
//     if (!plainText && placeholder) {
//       return (
//         <Text style={[styles.placeholder, { color: placeholderTextColor }]}>
//           {placeholder}
//         </Text>
//       );
//     }

//     let charIndex = 0;
    
//     return segments.map((segment, segmentIndex) => {
//       if (!segment.text) return null;

//       const segmentStart = charIndex;
//       const segmentEnd = charIndex + segment.text.length;
//       charIndex = segmentEnd;

//       const hasSelection = isFocused && selection.start !== selection.end;
//       const isSelected = hasSelection && 
//         segmentEnd > selection.start && 
//         segmentStart < selection.end;

//       if (isSelected) {
//         const parts: { text: string; selected: boolean }[] = [];
        
//         if (segmentStart < selection.start) {
//           parts.push({
//             text: segment.text.substring(0, selection.start - segmentStart),
//             selected: false
//           });
//         }
        
//         const selectedStart = Math.max(0, selection.start - segmentStart);
//         const selectedEnd = Math.min(segment.text.length, selection.end - segmentStart);
//         parts.push({
//           text: segment.text.substring(selectedStart, selectedEnd),
//           selected: true
//         });
        
//         if (segmentEnd > selection.end) {
//           parts.push({
//             text: segment.text.substring(selection.end - segmentStart),
//             selected: false
//           });
//         }

//         return (
//           <Text key={`segment-${segmentIndex}`}>
//             {parts.map((part, partIndex) => {
//               const textStyle = getTextStyle(segment, part.selected);
//               const prefix = partIndex === 0 ? getPrefix(segment) : '';
//               return (
//                 <Text key={`part-${partIndex}`} style={textStyle}>
//                   {prefix}{part.text}
//                 </Text>
//               );
//             })}
//           </Text>
//         );
//       }

//       const textStyle = getTextStyle(segment, false);

//       if (segment.text.trim() === '---') {
//         return (
//           <View key={`segment-${segmentIndex}`} style={styles.divider}>
//             <View style={styles.dividerLine} />
//           </View>
//         );
//       }

//       return (
//         <Text key={`segment-${segmentIndex}`} style={textStyle}>
//           {getPrefix(segment)}{segment.text}
//         </Text>
//       );
//     });
//   };

//   return (
//     <View style={[styles.container, style as any]}>
//       {/* Formatted text overlay - matches input exactly */}
//       <View 
//         style={styles.formattedOverlay}
//         pointerEvents="none"
//       >
//         {renderFormattedText()}
//       </View>

//       {/* Input with same styling - text rendered but made transparent via opacity mask */}
//       <TextInput
//         ref={inputRef}
//         {...props}
//         value={plainText}
//         onChangeText={handleChangeText}
//         onSelectionChange={handleSelectionChange}
//         onFocus={() => setIsFocused(true)}
//         onBlur={() => setIsFocused(false)}
//         style={[
//           styles.textInput,
//           style,
//           // Critical: make the text itself transparent while keeping cursor/selection visible
//           { color: 'rgba(0,0,0,0.003)' }
//         ]}
//         selectionColor={Platform.OS === 'ios' ? 'rgba(0, 122, 255, 0.4)' : 'rgba(59, 130, 246, 0.4)'}
//         textAlignVertical="top"
//         underlineColorAndroid="transparent"
//         multiline
//         scrollEnabled={false}
//       />
//     </View>
//   );
// });

// RichTextInput.displayName = 'RichTextInput';

// const styles = StyleSheet.create({
//   container: {
//     position: 'relative',
//     minHeight: 100,
//   },
//   formattedOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     paddingTop: Platform.OS === 'ios' ? 8 : 8,
//     paddingBottom: Platform.OS === 'ios' ? 8 : 8,
//     paddingLeft: Platform.OS === 'ios' ? 4 : 5,
//     paddingRight: 4,
//     pointerEvents: 'none',
//     zIndex: 1,
//   },
//   textInput: {
//     fontSize: 16,
//     lineHeight: 24,
//     paddingTop: Platform.OS === 'ios' ? 8 : 8,
//     paddingBottom: Platform.OS === 'ios' ? 8 : 8,
//     paddingLeft: Platform.OS === 'ios' ? 4 : 5,
//     paddingRight: 4,
//     minHeight: 100,
//     backgroundColor: 'transparent',
//     zIndex: 2,
//   },
//   placeholder: {
//     fontSize: 16,
//     lineHeight: 24,
//   },
//   divider: {
//     width: '100%',
//     paddingVertical: 12,
//   },
//   dividerLine: {
//     height: 1,
//     backgroundColor: '#d1d5db',
//   },
// });

// export default RichTextInput;