// // hooks/useRichTextEditor.ts - FIXED VERSION
// import { TextFormat } from '@/components/Interface/rich-text-toolbar';
// import { useCallback, useRef, useState } from 'react';
// import * as Y from 'yjs';

// export interface RichTextSegment {
//   text: string;
//   formats: TextFormat;
// }

// export interface RichTextEditorState {
//   segments: RichTextSegment[];
//   activeFormats: TextFormat;
//   pendingFormat: TextFormat;
//   applyFormat: (format: Partial<TextFormat>) => void;
//   handleTextChange: (newText: string, selectionStart: number, selectionEnd: number) => void;
//   handleSelectionChange: (selectionStart: number, selectionEnd: number) => void;
//   getPlainText: () => string;
//   getFormattedText: () => RichTextSegment[];
//   syncToYjs: (yText: Y.Text) => void;
//   syncFromYjs: (yText: Y.Text) => void;
//   applyYjsUpdate: (yText: Y.Text) => void;
// }

// export function useRichTextEditor(
//   initialText: string = ''
// ): RichTextEditorState {
//   const [segments, setSegments] = useState<RichTextSegment[]>([
//     { text: initialText, formats: {} }
//   ]);
//   const [activeFormats, setActiveFormats] = useState<TextFormat>({});
//   const [pendingFormat, setPendingFormat] = useState<TextFormat>({});
  
//   const lastSelectionRef = useRef({ start: 0, end: 0 });
//   const isSyncingRef = useRef(false);

//   // Convert segments to plain text
//   const getPlainText = useCallback((): string => {
//     return segments.map(seg => seg.text).join('');
//   }, [segments]);

//   // Get formatted segments
//   const getFormattedText = useCallback((): RichTextSegment[] => {
//     return segments;
//   }, [segments]);

//   // Merge adjacent segments with identical formats
//   const mergeSegments = (segments: RichTextSegment[]): RichTextSegment[] => {
//     if (segments.length <= 1) return segments;

//     const merged: RichTextSegment[] = [segments[0]];

//     for (let i = 1; i < segments.length; i++) {
//       const current = segments[i];
//       const previous = merged[merged.length - 1];

//       if (JSON.stringify(current.formats) === JSON.stringify(previous.formats)) {
//         previous.text += current.text;
//       } else {
//         merged.push(current);
//       }
//     }

//     return merged;
//   };

//   // Get segment and position info at a specific cursor position
//   const getSegmentAtPosition = useCallback((position: number): { 
//     segment: RichTextSegment | null; 
//     segmentIndex: number;
//     segmentStart: number;
//     segmentEnd: number;
//     relativePosition: number;
//   } => {
//     let currentPos = 0;
    
//     for (let i = 0; i < segments.length; i++) {
//       const segment = segments[i];
//       const segmentEnd = currentPos + segment.text.length;
      
//       if (position >= currentPos && position <= segmentEnd) {
//         return {
//           segment,
//           segmentIndex: i,
//           segmentStart: currentPos,
//           segmentEnd,
//           relativePosition: position - currentPos
//         };
//       }
      
//       currentPos = segmentEnd;
//     }
    
//     // Cursor at very end
//     if (segments.length > 0) {
//       const lastSegment = segments[segments.length - 1];
//       return {
//         segment: lastSegment,
//         segmentIndex: segments.length - 1,
//         segmentStart: currentPos - lastSegment.text.length,
//         segmentEnd: currentPos,
//         relativePosition: lastSegment.text.length
//       };
//     }
    
//     return {
//       segment: null,
//       segmentIndex: -1,
//       segmentStart: 0,
//       segmentEnd: 0,
//       relativePosition: 0
//     };
//   }, [segments]);

//   // Get all unique formats in a selection range
//   const getFormatsInRange = useCallback((start: number, end: number): TextFormat[] => {
//     if (start === end) {
//       const info = getSegmentAtPosition(start);
//       return info.segment ? [info.segment.formats] : [{}];
//     }

//     const formats: TextFormat[] = [];
//     const seen = new Set<string>();
//     let currentPos = 0;

//     for (const segment of segments) {
//       const segmentEnd = currentPos + segment.text.length;

//       // Check if segment overlaps with selection
//       if (segmentEnd > start && currentPos < end) {
//         const formatKey = JSON.stringify(segment.formats);
//         if (!seen.has(formatKey)) {
//           formats.push(segment.formats);
//           seen.add(formatKey);
//         }
//       }

//       currentPos = segmentEnd;
//       if (currentPos >= end) break;
//     }

//     return formats.length > 0 ? formats : [{}];
//   }, [segments, getSegmentAtPosition]);

//   // Check if a format is consistently applied across all formats
//   const getFormatState = useCallback((
//     formatKey: keyof TextFormat, 
//     formats: TextFormat[]
//   ): boolean | 'mixed' => {
//     if (formats.length === 0) return false;
    
//     const firstValue = formats[0][formatKey];
//     const allSame = formats.every(f => 
//       JSON.stringify(f[formatKey]) === JSON.stringify(firstValue)
//     );

//     if (!allSame) return 'mixed';
//     return !!firstValue;
//   }, []);

//   // Update active formats based on selection
//   const handleSelectionChange = useCallback((selectionStart: number, selectionEnd: number) => {
//     lastSelectionRef.current = { start: selectionStart, end: selectionEnd };

//     const formatsInRange = getFormatsInRange(selectionStart, selectionEnd);
    
//     console.log('Selection change:', selectionStart, selectionEnd, 'formats:', formatsInRange.length);

//     // Build active formats object
//     const newActiveFormats: TextFormat = {};
//     const formatKeys: (keyof TextFormat)[] = [
//       'bold', 'italic', 'underline', 'strikethrough', 
//       'color', 'backgroundColor', 'heading', 'listType'
//     ];

//     formatKeys.forEach(key => {
//       const state = getFormatState(key, formatsInRange);
//       if (state === 'mixed') {
//         // Use undefined to signal mixed state to toolbar
//         newActiveFormats[key] = undefined;
//       } else if (state) {
//         newActiveFormats[key] = formatsInRange[0][key];
//       }
//     });

//     setActiveFormats(newActiveFormats);

//     // Update pending format for cursor-only selection
//     if (selectionStart === selectionEnd) {
//       const info = getSegmentAtPosition(selectionStart);
//       const cursorFormat = info.segment ? info.segment.formats : {};
//       console.log('Cursor format at', selectionStart, ':', cursorFormat);
//       setPendingFormat(cursorFormat);
//     }
//   }, [getFormatsInRange, getFormatState, getSegmentAtPosition]);

//   // Apply format to selected text or set pending format
//   const applyFormat = useCallback((format: Partial<TextFormat>) => {
//     const { start, end } = lastSelectionRef.current;
    
//     console.log('Apply format:', format, 'selection:', start, end);

//     // NO SELECTION - cursor only
//     if (start === end) {
//       const info = getSegmentAtPosition(start);
      
//       // CRITICAL: If cursor is INSIDE a segment (not at boundaries), 
//       // apply format to the ENTIRE segment
//       if (info.segment && info.relativePosition > 0 && info.relativePosition < info.segment.text.length) {
//         console.log('Cursor inside segment - applying to entire segment:', info.segmentStart, 'to', info.segmentEnd);
        
//         // Apply format to the entire segment
//         setSegments(currentSegments => {
//           const newSegments = [...currentSegments];
//           const segment = newSegments[info.segmentIndex];
          
//           // Merge formats
//           const newFormats = { ...segment.formats };
          
//           Object.keys(format).forEach(key => {
//             const formatKey = key as keyof TextFormat;
//             if (typeof format[formatKey] === 'boolean') {
//               if (format[formatKey] === false) {
//                 delete newFormats[formatKey];
//               } else {
//                 newFormats[formatKey] = format[formatKey] as any;
//               }
//             } else if (format[formatKey] === null) {
//               delete newFormats[formatKey];
//             } else {
//               newFormats[formatKey] = format[formatKey] as any;
//             }
//           });
          
//           newSegments[info.segmentIndex] = {
//             ...segment,
//             formats: newFormats
//           };
          
//           return mergeSegments(newSegments);
//         });
        
//         // Update active formats
//         handleSelectionChange(start, end);
//         return;
//       }
      
//       // Cursor at boundary or empty document - set pending format
//       setPendingFormat(prev => {
//         const baseFormat = info.segment ? info.segment.formats : {};
//         const newPending = { ...baseFormat, ...prev, ...format };
        
//         // Handle toggles
//         Object.keys(format).forEach(key => {
//           const formatKey = key as keyof TextFormat;
//           if (format[formatKey] === false || format[formatKey] === null) {
//             delete newPending[formatKey];
//           }
//         });
        
//         return newPending;
//       });
      
//       // Update active formats immediately
//       setActiveFormats(prev => {
//         const newActive = { ...prev, ...format };
//         Object.keys(format).forEach(key => {
//           const formatKey = key as keyof TextFormat;
//           if (format[formatKey] === false || format[formatKey] === null) {
//             delete newActive[formatKey];
//           }
//         });
//         return newActive;
//       });
      
//       return;
//     }

//     // HAS SELECTION - apply to selected range
//     setSegments(currentSegments => {
//       let newSegments: RichTextSegment[] = [];
//       let currentPos = 0;

//       for (const segment of currentSegments) {
//         const segmentEnd = currentPos + segment.text.length;

//         // Segment before selection
//         if (segmentEnd <= start) {
//           newSegments.push(segment);
//           currentPos = segmentEnd;
//           continue;
//         }

//         // Segment after selection
//         if (currentPos >= end) {
//           newSegments.push(segment);
//           currentPos = segmentEnd;
//           continue;
//         }

//         // Segment overlaps with selection
//         const overlapStart = Math.max(start, currentPos);
//         const overlapEnd = Math.min(end, segmentEnd);

//         // Before overlap
//         if (currentPos < overlapStart) {
//           newSegments.push({
//             text: segment.text.substring(0, overlapStart - currentPos),
//             formats: segment.formats
//           });
//         }

//         // Overlapping part - merge formats
//         const overlapText = segment.text.substring(
//           overlapStart - currentPos,
//           overlapEnd - currentPos
//         );
        
//         const newFormats = { ...segment.formats };
        
//         Object.keys(format).forEach(key => {
//           const formatKey = key as keyof TextFormat;
          
//           if (typeof format[formatKey] === 'boolean') {
//             if (format[formatKey] === false) {
//               delete newFormats[formatKey];
//             } else {
//               newFormats[formatKey] = format[formatKey] as any;
//             }
//           } else if (format[formatKey] === null) {
//             delete newFormats[formatKey];
//           } else {
//             newFormats[formatKey] = format[formatKey] as any;
//           }
//         });

//         newSegments.push({
//           text: overlapText,
//           formats: newFormats
//         });

//         // After overlap
//         if (overlapEnd < segmentEnd) {
//           newSegments.push({
//             text: segment.text.substring(overlapEnd - currentPos),
//             formats: segment.formats
//           });
//         }

//         currentPos = segmentEnd;
//       }

//       return mergeSegments(newSegments);
//     });

//     // Update active formats
//     handleSelectionChange(start, end);
//   }, [getSegmentAtPosition, handleSelectionChange]);

//   // Handle text changes
//   const handleTextChange = useCallback((
//     newText: string, 
//     selectionStart: number, 
//     selectionEnd: number
//   ) => {
//     if (isSyncingRef.current) return;

//     lastSelectionRef.current = { start: selectionStart, end: selectionEnd };

//     const oldText = getPlainText();
    
//     console.log('Text change - old:', oldText.length, 'new:', newText.length);
    
//     // Complete deletion
//     if (newText.length === 0 && oldText.length > 0) {
//       setSegments([{ text: '', formats: {} }]);
//       setPendingFormat({});
//       setActiveFormats({});
//       return;
//     }
    
//     // Calculate what changed
//     let changeStart = 0;
//     while (changeStart < Math.min(oldText.length, newText.length) &&
//            oldText[changeStart] === newText[changeStart]) {
//       changeStart++;
//     }

//     let oldEnd = oldText.length;
//     let newEnd = newText.length;
//     while (oldEnd > changeStart && newEnd > changeStart &&
//            oldText[oldEnd - 1] === newText[newEnd - 1]) {
//       oldEnd--;
//       newEnd--;
//     }

//     const deletedText = oldText.substring(changeStart, oldEnd);
//     const insertedText = newText.substring(changeStart, newEnd);

//     console.log('Change at', changeStart, '- deleted:', deletedText.length, 'inserted:', insertedText.length);

//     // Apply changes to segments
//     setSegments(currentSegments => {
//       let newSegments: RichTextSegment[] = [];
//       let currentPos = 0;

//       for (const segment of currentSegments) {
//         const segmentEnd = currentPos + segment.text.length;

//         if (segmentEnd <= changeStart) {
//           // Before change
//           newSegments.push(segment);
//         } else if (currentPos >= oldEnd) {
//           // After deletion
//           newSegments.push(segment);
//         } else {
//           // Segment affected by change
//           const keepStart = Math.max(0, changeStart - currentPos);
//           const keepEnd = Math.min(segment.text.length, oldEnd - currentPos);
          
//           const beforeDelete = segment.text.substring(0, keepStart);
//           const afterDelete = segment.text.substring(keepEnd);

//           if (beforeDelete) {
//             newSegments.push({
//               text: beforeDelete,
//               formats: segment.formats
//             });
//           }

//           // Insert new text
//           if (currentPos <= changeStart && changeStart < segmentEnd && insertedText) {
//             const insertFormat = Object.keys(pendingFormat).length > 0
//               ? pendingFormat
//               : segment.formats;
            
//             newSegments.push({
//               text: insertedText,
//               formats: insertFormat
//             });
//           }

//           if (afterDelete) {
//             newSegments.push({
//               text: afterDelete,
//               formats: segment.formats
//             });
//           }
//         }

//         currentPos = segmentEnd;
//       }

//       // Inserting at end
//       if (changeStart >= oldText.length && insertedText) {
//         const insertFormat = Object.keys(pendingFormat).length > 0
//           ? pendingFormat
//           : (newSegments.length > 0 ? newSegments[newSegments.length - 1].formats : {});
        
//         newSegments.push({
//           text: insertedText,
//           formats: insertFormat
//         });
//       }

//       // Clear pending format after insertion
//       if (insertedText) {
//         setPendingFormat({});
//       }

//       return mergeSegments(newSegments.length > 0 ? newSegments : [{ text: '', formats: {} }]);
//     });

//     // Update active formats
//     handleSelectionChange(selectionStart, selectionEnd);
//   }, [pendingFormat, getPlainText, handleSelectionChange]);

//   // Y.js sync functions (unchanged)
//   const applyYjsUpdate = useCallback((yText: Y.Text) => {
//     if (isSyncingRef.current) return;
    
//     isSyncingRef.current = true;
    
//     try {
//       const currentYText = yText.toString();
//       const currentPlainText = getPlainText();
      
//       if (currentYText === currentPlainText) return;
      
//       let changeStart = 0;
//       while (changeStart < Math.min(currentYText.length, currentPlainText.length) &&
//              currentYText[changeStart] === currentPlainText[changeStart]) {
//         changeStart++;
//       }

//       let oldEnd = currentYText.length;
//       let newEnd = currentPlainText.length;
//       while (oldEnd > changeStart && newEnd > changeStart &&
//              currentYText[oldEnd - 1] === currentPlainText[newEnd - 1]) {
//         oldEnd--;
//         newEnd--;
//       }

//       const deleteCount = oldEnd - changeStart;
//       const insertText = currentPlainText.substring(changeStart, newEnd);

//       if (deleteCount > 0) {
//         yText.delete(changeStart, deleteCount);
//       }
      
//       if (insertText.length > 0) {
//         const info = getSegmentAtPosition(changeStart);
//         const insertFormat = info.segment ? info.segment.formats : {};
        
//         const attrs: any = {};
//         if (insertFormat.bold) attrs.bold = true;
//         if (insertFormat.italic) attrs.italic = true;
//         if (insertFormat.underline) attrs.underline = true;
//         if (insertFormat.strikethrough) attrs.strikethrough = true;
//         if (insertFormat.color) attrs.color = insertFormat.color;
//         if (insertFormat.backgroundColor) attrs.backgroundColor = insertFormat.backgroundColor;
//         if (insertFormat.heading) attrs.heading = insertFormat.heading;
//         if (insertFormat.listType) attrs.listType = insertFormat.listType;
        
//         yText.insert(changeStart, insertText, Object.keys(attrs).length > 0 ? attrs : undefined);
//       }
//     } finally {
//       isSyncingRef.current = false;
//     }
//   }, [segments, getPlainText, getSegmentAtPosition]);

//   const syncToYjs = useCallback((yText: Y.Text) => {
//     if (isSyncingRef.current) return;
    
//     isSyncingRef.current = true;
    
//     try {
//       const plainText = getPlainText();
//       const currentYText = yText.toString();

//       if (Math.abs(plainText.length - currentYText.length) > 100) {
//         yText.delete(0, yText.length);

//         segments.forEach(segment => {
//           if (segment.text.length > 0) {
//             const attrs: any = {};
//             if (segment.formats.bold) attrs.bold = true;
//             if (segment.formats.italic) attrs.italic = true;
//             if (segment.formats.underline) attrs.underline = true;
//             if (segment.formats.strikethrough) attrs.strikethrough = true;
//             if (segment.formats.color) attrs.color = segment.formats.color;
//             if (segment.formats.backgroundColor) attrs.backgroundColor = segment.formats.backgroundColor;
//             if (segment.formats.heading) attrs.heading = segment.formats.heading;
//             if (segment.formats.listType) attrs.listType = segment.formats.listType;

//             yText.insert(yText.length, segment.text, Object.keys(attrs).length > 0 ? attrs : undefined);
//           }
//         });
//       } else {
//         applyYjsUpdate(yText);
//       }
//     } finally {
//       isSyncingRef.current = false;
//     }
//   }, [segments, getPlainText, applyYjsUpdate]);

//   const syncFromYjs = useCallback((yText: Y.Text) => {
//     if (isSyncingRef.current) return;
    
//     isSyncingRef.current = true;
    
//     try {
//       const newSegments: RichTextSegment[] = [];
      
//       yText.toDelta().forEach((delta: any) => {
//         const text = delta.insert || '';
//         const attrs = delta.attributes || {};

//         const formats: TextFormat = {
//           bold: attrs.bold || false,
//           italic: attrs.italic || false,
//           underline: attrs.underline || false,
//           strikethrough: attrs.strikethrough || false,
//           color: attrs.color || undefined,
//           backgroundColor: attrs.backgroundColor || undefined,
//           heading: attrs.heading || null,
//           listType: attrs.listType || null,
//         };

//         if (text) {
//           newSegments.push({ text, formats });
//         }
//       });

//       setSegments(mergeSegments(newSegments.length > 0 ? newSegments : [{ text: yText.toString(), formats: {} }]));
      
//       const { start, end } = lastSelectionRef.current;
//       handleSelectionChange(start, end);
//     } finally {
//       isSyncingRef.current = false;
//     }
//   }, [handleSelectionChange]);

//   return {
//     segments,
//     activeFormats,
//     pendingFormat,
//     applyFormat,
//     handleTextChange,
//     handleSelectionChange,
//     getPlainText,
//     getFormattedText,
//     syncToYjs,
//     syncFromYjs,
//     applyYjsUpdate,
//   };
// }