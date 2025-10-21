// // components/Editor/RichTextRenderer.tsx
// import {
//   DividerContent,
//   HeadingContent,
//   ListContent,
//   MathContent,
//   RichTextBlock,
//   TableContent,
//   TextContent,
//   TextFormatting,
// } from '@/app/types/notebook';
// import { Ionicons } from '@expo/vector-icons';
// import React from 'react';
// import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

// interface RichTextRendererProps {
//   blocks: RichTextBlock[];
//   onBlockPress?: (blockId: string) => void;
//   editable?: boolean;
// }

// export default function RichTextRenderer({
//   blocks,
//   onBlockPress,
//   editable = true,
// }: RichTextRendererProps) {
  
//   const renderFormattedText = (text: string, formatting?: TextFormatting[]) => {
//     if (!formatting || formatting.length === 0) {
//       return <Text style={styles.text}>{text}</Text>;
//     }
    
//     // Build text segments with formatting
//     const segments: React.ReactNode[] = [];
//     let lastIndex = 0;
    
//     // Sort formatting by start position
//     const sortedFormatting = [...formatting].sort((a, b) => a.start - b.start);
    
//     for (const fmt of sortedFormatting) {
//       // Add unformatted text before this range
//       if (fmt.start > lastIndex) {
//         segments.push(
//           <Text key={`plain-${lastIndex}`} style={styles.text}>
//             {text.substring(lastIndex, fmt.start)}
//           </Text>
//         );
//       }
      
//       // Build styles for this segment
//       const segmentStyles: TextStyle[] = [styles.text as TextStyle];
      
//       for (const style of fmt.styles) {
//         switch (style.type) {
//           case 'bold':
//             segmentStyles.push(styles.bold as TextStyle);
//             break;
//           case 'italic':
//             segmentStyles.push(styles.italic as TextStyle);
//             break;
//           case 'underline':
//             segmentStyles.push(styles.underline as TextStyle);
//             break;
//           case 'strikethrough':
//             segmentStyles.push(styles.strikethrough as TextStyle);
//             break;
//           case 'color':
//             segmentStyles.push({ color: style.value });
//             break;
//           case 'bgColor':
//             segmentStyles.push({ backgroundColor: style.value });
//             break;
//           case 'code':
//             segmentStyles.push(styles.code as TextStyle);
//             break;
//         }
//       }
      
//       segments.push(
//         <Text key={`fmt-${fmt.start}`} style={segmentStyles}>
//           {text.substring(fmt.start, fmt.end)}
//         </Text>
//       );
      
//       lastIndex = fmt.end;
//     }
    
//     // Add remaining unformatted text
//     if (lastIndex < text.length) {
//       segments.push(
//         <Text key={`plain-${lastIndex}`} style={styles.text}>
//           {text.substring(lastIndex)}
//         </Text>
//       );
//     }
    
//     return <Text>{segments}</Text>;
//   };
  
//   const renderParagraph = (block: RichTextBlock) => {
//     const content = block.content as TextContent;
    
//     return (
//       <TouchableOpacity
//         key={block.id}
//         style={styles.paragraphBlock as ViewStyle}
//         onPress={() => onBlockPress?.(block.id)}
//         disabled={!editable}
//       >
//         {renderFormattedText(content.text, content.formatting)}
//       </TouchableOpacity>
//     );
//   };
  
//   const renderHeading = (block: RichTextBlock) => {
//     const content = block.content as HeadingContent;
//     const headingStyle = content.level === 1 ? (styles.h1 as TextStyle) :
//                         content.level === 2 ? (styles.h2 as TextStyle) : (styles.h3 as TextStyle);
    
//     return (
//       <TouchableOpacity
//         key={block.id}
//         style={styles.headingBlock as ViewStyle}
//         onPress={() => onBlockPress?.(block.id)}
//         disabled={!editable}
//       >
//         <Text style={headingStyle}>
//           {renderFormattedText(content.text, content.formatting)}
//         </Text>
//       </TouchableOpacity>
//     );
//   };
  
//   const renderList = (block: RichTextBlock) => {
//     const content = block.content as ListContent;
//     const isBullet = content.type === 'bullet';
    
//     return (
//       <View key={block.id} style={styles.listBlock as ViewStyle}>
//         {content.items.map((item, index) => (
//           <TouchableOpacity
//             key={`${block.id}-item-${index}`}
//             style={[styles.listItem as ViewStyle, { paddingLeft: item.indent * 20 }]}
//             onPress={() => onBlockPress?.(block.id)}
//             disabled={!editable}
//           >
//             <Text style={styles.listMarker as TextStyle}>
//               {isBullet ? '•' : `${index + 1}.`}
//             </Text>
//             {renderFormattedText(item.text, item.formatting)}
//           </TouchableOpacity>
//         ))}
//       </View>
//     );
//   };
  
//   const renderTable = (block: RichTextBlock) => {
//     const content = block.content as TableContent;
    
//     return (
//       <View key={block.id} style={styles.tableBlock as ViewStyle}>
//         {content.cells.map((row, rowIndex) => (
//           <View key={`row-${rowIndex}`} style={styles.tableRow as ViewStyle}>
//             {row.map((cell, colIndex) => (
//               <TouchableOpacity
//                 key={`cell-${rowIndex}-${colIndex}`}
//                 style={[
//                   styles.tableCell as ViewStyle,
//                   rowIndex === 0 && content.hasHeader && (styles.tableHeaderCell as ViewStyle),
//                   { backgroundColor: cell.bgColor },
//                 ]}
//                 onPress={() => onBlockPress?.(block.id)}
//                 disabled={!editable}
//               >
//                 {renderFormattedText(cell.text, cell.formatting)}
//               </TouchableOpacity>
//             ))}
//           </View>
//         ))}
//       </View>
//     );
//   };
  
//   const renderMath = (block: RichTextBlock) => {
//     const content = block.content as MathContent;
    
//     return (
//       <TouchableOpacity
//         key={block.id}
//         style={[
//           styles.mathBlock as ViewStyle,
//           content.display === 'inline' ? (styles.mathInline as ViewStyle) : (styles.mathDisplay as ViewStyle),
//         ]}
//         onPress={() => onBlockPress?.(block.id)}
//         disabled={!editable}
//       >
//         <Ionicons name="calculator" size={16} color="#60a5fa" />
//         <Text style={styles.mathText as TextStyle}>{content.latex}</Text>
//       </TouchableOpacity>
//     );
//   };
  
//   const renderDivider = (block: RichTextBlock) => {
//     const content = block.content as DividerContent;
    
//     return (
//       <View key={block.id} style={styles.dividerBlock as ViewStyle}>
//         <View
//           style={[
//             styles.dividerLine as ViewStyle,
//             {
//               borderStyle: content.style || 'solid',
//               borderColor: content.color || '#4b5563',
//             },
//           ]}
//         />
//       </View>
//     );
//   };
  
//   const renderBlock = (block: RichTextBlock) => {
//     switch (block.type) {
//       case 'paragraph':
//         return renderParagraph(block);
//       case 'heading':
//         return renderHeading(block);
//       case 'list':
//         return renderList(block);
//       case 'table':
//         return renderTable(block);
//       case 'math':
//         return renderMath(block);
//       case 'divider':
//         return renderDivider(block);
//       default:
//         return null;
//     }
//   };
  
//   return (
//     <View style={styles.container}>
//       {blocks.map(renderBlock)}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   } as ViewStyle,
//   paragraphBlock: {
//     marginBottom: 12,
//   } as ViewStyle,
//   headingBlock: {
//     marginBottom: 16,
//     marginTop: 8,
//   } as ViewStyle,
//   text: {
//     color: '#fff',
//     fontSize: 16,
//     lineHeight: 24,
//   } as TextStyle,
//   bold: {
//     fontWeight: 'bold',
//   } as TextStyle,
//   italic: {
//     fontStyle: 'italic',
//   } as TextStyle,
//   underline: {
//     textDecorationLine: 'underline',
//   } as TextStyle,
//   strikethrough: {
//     textDecorationLine: 'line-through',
//   } as TextStyle,
//   code: {
//     fontFamily: 'monospace',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     paddingHorizontal: 4,
//     borderRadius: 4,
//   } as TextStyle,
//   h1: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#fff',
//     lineHeight: 40,
//   } as TextStyle,
//   h2: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     lineHeight: 32,
//   } as TextStyle,
//   h3: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//     lineHeight: 28,
//   } as TextStyle,
//   listBlock: {
//     marginBottom: 12,
//   } as ViewStyle,
//   listItem: {
//     flexDirection: 'row',
//     marginBottom: 8,
//     alignItems: 'flex-start',
//   } as ViewStyle,
//   listMarker: {
//     color: '#60a5fa',
//     fontSize: 16,
//     marginRight: 8,
//     minWidth: 24,
//   } as TextStyle,
//   tableBlock: {
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//     borderRadius: 8,
//     overflow: 'hidden',
//   } as ViewStyle,
//   tableRow: {
//     flexDirection: 'row',
//   } as ViewStyle,
//   tableCell: {
//     flex: 1,
//     padding: 12,
//     borderRightWidth: 1,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//     minHeight: 40,
//   } as ViewStyle,
//   tableHeaderCell: {
//     backgroundColor: 'rgba(96, 165, 250, 0.2)',
//     fontWeight: 'bold',
//   } as ViewStyle,
//   mathBlock: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: 'rgba(96, 165, 250, 0.1)',
//     borderRadius: 8,
//     borderLeftWidth: 3,
//     borderLeftColor: '#60a5fa',
//     marginBottom: 12,
//   } as ViewStyle,
//   mathInline: {
//     flexDirection: 'row',
//   } as ViewStyle,
//   mathDisplay: {
//     marginVertical: 8,
//   } as ViewStyle,
//   mathText: {
//     color: '#60a5fa',
//     fontSize: 16,
//     fontFamily: 'monospace',
//     marginLeft: 8,
//   } as TextStyle,
//   dividerBlock: {
//     marginVertical: 16,
//   } as ViewStyle,
//   dividerLine: {
//     borderBottomWidth: 2,
//     borderColor: '#4b5563',
//   } as ViewStyle,
// });