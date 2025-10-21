// utils/richTextUtils.ts - Complete Clean Version
import {
    DividerContent,
    HeadingContent,
    ListContent,
    ListItem,
    MathContent,
    RichTextBlock,
    TableCell,
    TableContent,
    TextContent,
    TextFormatting,
    TextStyle,
} from '@/app/types/notebook';

// ============= BLOCK CREATION =============

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createParagraphBlock(text: string = ''): RichTextBlock {
  return {
    id: generateBlockId(),
    type: 'paragraph',
    content: { text, formatting: [] } as TextContent,
  };
}

export function createHeadingBlock(level: 1 | 2 | 3, text: string = ''): RichTextBlock {
  return {
    id: generateBlockId(),
    type: 'heading',
    content: { level, text, formatting: [] } as HeadingContent,
  };
}

export function createListBlock(type: 'bullet' | 'numbered', items: string[] = ['']): RichTextBlock {
  return {
    id: generateBlockId(),
    type: 'list',
    content: {
      type,
      items: items.map(text => ({ text, formatting: [], indent: 0 })),
    } as ListContent,
  };
}

export function createTableBlock(rows: number, cols: number): RichTextBlock {
  const cells: TableCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ text: '', formatting: [], align: 'left' });
    }
    cells.push(row);
  }
  return {
    id: generateBlockId(),
    type: 'table',
    content: { rows, cols, cells, hasHeader: true } as TableContent,
  };
}

export function createMathBlock(latex: string, display: 'inline' | 'block' = 'block'): RichTextBlock {
  return {
    id: generateBlockId(),
    type: 'math',
    content: { latex, display } as MathContent,
  };
}

export function createDividerBlock(): RichTextBlock {
  return {
    id: generateBlockId(),
    type: 'divider',
    content: { style: 'solid', color: '#4b5563' } as DividerContent,
  };
}

// ============= FORMATTING =============

export function applyFormatting(
  text: string,
  start: number,
  end: number,
  style: TextStyle,
  existingFormatting: TextFormatting[] = []
): TextFormatting[] {
  const newFormatting: TextFormatting = { start, end, styles: [style] };
  const merged = [...existingFormatting];
  
  let found = false;
  for (let i = 0; i < merged.length; i++) {
    const existing = merged[i];
    if (existing.start === start && existing.end === end) {
      const existingStyleIndex = existing.styles.findIndex(s => s.type === style.type);
      if (existingStyleIndex >= 0) {
        existing.styles[existingStyleIndex] = style;
      } else {
        existing.styles.push(style);
      }
      found = true;
      break;
    }
  }
  
  if (!found) merged.push(newFormatting);
  return merged.sort((a, b) => a.start - b.start);
}

export function removeFormatting(
  start: number,
  end: number,
  styleType: string,
  existingFormatting: TextFormatting[] = []
): TextFormatting[] {
  const result: TextFormatting[] = [];
  for (const formatting of existingFormatting) {
    if (formatting.start >= start && formatting.end <= end) {
      const remainingStyles = formatting.styles.filter(s => s.type !== styleType);
      if (remainingStyles.length > 0) {
        result.push({ ...formatting, styles: remainingStyles });
      }
    } else {
      result.push(formatting);
    }
  }
  return result;
}

export function toggleFormatting(
  start: number,
  end: number,
  styleType: string,
  existingFormatting: TextFormatting[] = [],
  value?: string
): TextFormatting[] {
  const hasStyle = hasStyleInRange(existingFormatting, start, end, styleType);
  if (hasStyle) {
    return removeFormatting(start, end, styleType, existingFormatting);
  } else {
    const style: TextStyle = { type: styleType as any, value };
    return applyFormatting('', start, end, style, existingFormatting);
  }
}

function hasStyleInRange(formatting: TextFormatting[], start: number, end: number, styleType: string): boolean {
  for (const fmt of formatting) {
    if (fmt.start <= start && fmt.end >= end) {
      if (fmt.styles.some(s => s.type === styleType)) return true;
    }
  }
  return false;
}

export function hasStyle(formatting: TextFormatting[], start: number, end: number, styleType: string): boolean {
  return hasStyleInRange(formatting, start, end, styleType);
}

export function getActiveStyles(formatting: TextFormatting[], position: number): TextStyle[] {
  const activeStyles: TextStyle[] = [];
  for (const fmt of formatting) {
    if (fmt.start <= position && fmt.end >= position) {
      activeStyles.push(...fmt.styles);
    }
  }
  return activeStyles;
}

export function mergeFormatting(formatting: TextFormatting[]): TextFormatting[] {
  if (formatting.length === 0) return [];
  const sorted = [...formatting].sort((a, b) => a.start - b.start);
  const merged: TextFormatting[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      for (const style of current.styles) {
        if (!last.styles.some(s => s.type === style.type)) {
          last.styles.push(style);
        }
      }
    } else {
      merged.push(current);
    }
  }
  return merged;
}

// ============= BLOCK TEXT OPERATIONS =============

export function getBlockText(block: RichTextBlock): string {
  switch (block.type) {
    case 'paragraph': return (block.content as TextContent).text;
    case 'heading': return (block.content as HeadingContent).text;
    case 'list': return (block.content as ListContent).items.map(i => i.text).join('\n');
    case 'table': return (block.content as TableContent).cells.flat().map(c => c.text).join(' ');
    case 'math': return (block.content as MathContent).latex;
    default: return '';
  }
}

export function updateBlockText(block: RichTextBlock, newText: string): RichTextBlock {
  const updated = { ...block };
  switch (block.type) {
    case 'paragraph':
      updated.content = { ...(block.content as TextContent), text: newText };
      break;
    case 'heading':
      updated.content = { ...(block.content as HeadingContent), text: newText };
      break;
    case 'math':
      updated.content = { ...(block.content as MathContent), latex: newText };
      break;
  }
  return updated;
}

export function updateTableCell(block: RichTextBlock, row: number, col: number, newText: string): RichTextBlock {
  if (block.type !== 'table') return block;
  const tableContent = block.content as TableContent;
  const updatedCells = tableContent.cells.map((r, rIndex) =>
    r.map((cell, cIndex) => (rIndex === row && cIndex === col ? { ...cell, text: newText } : cell))
  );
  return { ...block, content: { ...tableContent, cells: updatedCells } };
}

export function updateListItem(block: RichTextBlock, itemIndex: number, newText: string): RichTextBlock {
  if (block.type !== 'list') return block;
  const listContent = block.content as ListContent;
  const updatedItems = listContent.items.map((item, index) =>
    index === itemIndex ? { ...item, text: newText } : item
  );
  return { ...block, content: { ...listContent, items: updatedItems } };
}

export function addListItem(block: RichTextBlock, afterIndex: number, text: string = ''): RichTextBlock {
  if (block.type !== 'list') return block;
  const listContent = block.content as ListContent;
  const newItem: ListItem = { text, formatting: [], indent: 0 };
  const updatedItems = [
    ...listContent.items.slice(0, afterIndex + 1),
    newItem,
    ...listContent.items.slice(afterIndex + 1),
  ];
  return { ...block, content: { ...listContent, items: updatedItems } };
}

export function removeListItem(block: RichTextBlock, itemIndex: number): RichTextBlock {
  if (block.type !== 'list') return block;
  const listContent = block.content as ListContent;
  const updatedItems = listContent.items.filter((_, index) => index !== itemIndex);
  if (updatedItems.length === 0) return createParagraphBlock();
  return { ...block, content: { ...listContent, items: updatedItems } };
}

// ============= BLOCK MANIPULATION =============

export function findBlockById(blocks: RichTextBlock[], blockId: string): RichTextBlock | null {
  return blocks.find(b => b.id === blockId) || null;
}

export function findBlockIndexById(blocks: RichTextBlock[], blockId: string): number {
  return blocks.findIndex(b => b.id === blockId);
}

export function insertBlockAfter(blocks: RichTextBlock[], afterBlockId: string, newBlock: RichTextBlock): RichTextBlock[] {
  const index = findBlockIndexById(blocks, afterBlockId);
  if (index === -1) return [...blocks, newBlock];
  return [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
}

export function deleteBlock(blocks: RichTextBlock[], blockId: string): RichTextBlock[] {
  const filtered = blocks.filter(b => b.id !== blockId);
  return filtered.length > 0 ? filtered : [createParagraphBlock()];
}

export function duplicateBlock(block: RichTextBlock): RichTextBlock {
  return { ...block, id: generateBlockId() };
}

export function moveBlockUp(blocks: RichTextBlock[], blockId: string): RichTextBlock[] {
  const index = findBlockIndexById(blocks, blockId);
  if (index <= 0) return blocks;
  const newBlocks = [...blocks];
  [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
  return newBlocks;
}

export function moveBlockDown(blocks: RichTextBlock[], blockId: string): RichTextBlock[] {
  const index = findBlockIndexById(blocks, blockId);
  if (index === -1 || index >= blocks.length - 1) return blocks;
  const newBlocks = [...blocks];
  [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
  return newBlocks;
}

export function convertBlockType(block: RichTextBlock, newType: 'paragraph' | 'heading' | 'list'): RichTextBlock {
  const text = getBlockText(block);
  switch (newType) {
    case 'paragraph': return createParagraphBlock(text);
    case 'heading': return createHeadingBlock(1, text);
    case 'list': return createListBlock('bullet', [text]);
    default: return block;
  }
}

// ============= BLOCK FORMATTING =============

export function applyFormattingToBlock(block: RichTextBlock, start: number, end: number, style: TextStyle): RichTextBlock {
  if (block.type !== 'paragraph' && block.type !== 'heading') return block;
  const content = block.content as TextContent | HeadingContent;
  const newFormatting = applyFormatting(content.text, start, end, style, content.formatting || []);
  return { ...block, content: { ...content, formatting: newFormatting } };
}

export function removeFormattingFromBlock(block: RichTextBlock, start: number, end: number, styleType: string): RichTextBlock {
  if (block.type !== 'paragraph' && block.type !== 'heading') return block;
  const content = block.content as TextContent | HeadingContent;
  const newFormatting = removeFormatting(start, end, styleType, content.formatting || []);
  return { ...block, content: { ...content, formatting: newFormatting } };
}

export function clearAllFormatting(block: RichTextBlock): RichTextBlock {
  if (block.type !== 'paragraph' && block.type !== 'heading') return block;
  const content = block.content as TextContent | HeadingContent;
  return { ...block, content: { ...content, formatting: [] } };
}

// ============= CONVERSION =============

export function blocksToPlainText(blocks: RichTextBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'paragraph': return (block.content as TextContent).text;
      case 'heading': return (block.content as HeadingContent).text;
      case 'list': return (block.content as ListContent).items.map(i => `• ${i.text}`).join('\n');
      case 'table': return (block.content as TableContent).cells.map(r => r.map(c => c.text).join(' | ')).join('\n');
      case 'math': return `[Math: ${(block.content as MathContent).latex}]`;
      case 'divider': return '---';
      default: return '';
    }
  }).join('\n\n');
}

export function plainTextToBlocks(text: string): RichTextBlock[] {
  if (!text) return [createParagraphBlock()];
  const lines = text.split('\n');
  const blocks: RichTextBlock[] = [];
  let currentParagraph = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph) {
        blocks.push(createParagraphBlock(currentParagraph));
        currentParagraph = '';
      }
      continue;
    }
    
    if (trimmed.startsWith('# ')) {
      if (currentParagraph) blocks.push(createParagraphBlock(currentParagraph));
      blocks.push(createHeadingBlock(1, trimmed.substring(2)));
      currentParagraph = '';
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (currentParagraph) blocks.push(createParagraphBlock(currentParagraph));
      blocks.push(createHeadingBlock(2, trimmed.substring(3)));
      currentParagraph = '';
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (currentParagraph) blocks.push(createParagraphBlock(currentParagraph));
      blocks.push(createHeadingBlock(3, trimmed.substring(4)));
      currentParagraph = '';
      continue;
    }
    if (trimmed === '---' || trimmed === '***') {
      if (currentParagraph) blocks.push(createParagraphBlock(currentParagraph));
      blocks.push(createDividerBlock());
      currentParagraph = '';
      continue;
    }
    
    currentParagraph = currentParagraph ? currentParagraph + '\n' + line : line;
  }
  
  if (currentParagraph) blocks.push(createParagraphBlock(currentParagraph));
  return blocks.length > 0 ? blocks : [createParagraphBlock()];
}

export function serializeBlocks(blocks: RichTextBlock[]): string {
  return JSON.stringify(blocks);
}

export function deserializeBlocks(json: string): RichTextBlock[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [createParagraphBlock()];
  } catch (error) {
    console.error('Error deserializing blocks:', error);
    return [createParagraphBlock()];
  }
}

export function exportToMarkdown(blocks: RichTextBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'paragraph': return (block.content as TextContent).text;
      case 'heading':
        const heading = block.content as HeadingContent;
        return `${'#'.repeat(heading.level)} ${heading.text}`;
      case 'list':
        const list = block.content as ListContent;
        return list.items.map((item, i) => {
          const marker = list.type === 'bullet' ? '-' : `${i + 1}.`;
          return `${'  '.repeat(item.indent)}${marker} ${item.text}`;
        }).join('\n');
      case 'table':
        const table = block.content as TableContent;
        return table.cells.map((row, i) => {
          const cells = row.map(c => c.text).join(' | ');
          const sep = i === 0 && table.hasHeader ? '\n' + row.map(() => '---').join(' | ') : '';
          return `| ${cells} |${sep}`;
        }).join('\n');
      case 'math':
        const math = block.content as MathContent;
        return math.display === 'block' ? `$$${math.latex}$$` : `$${math.latex}$`;
      case 'divider': return '---';
      default: return '';
    }
  }).join('\n\n');
}

export function importFromMarkdown(markdown: string): RichTextBlock[] {
  return plainTextToBlocks(markdown);
}

// ============= UTILITIES =============

export function getBlockSize(block: RichTextBlock): number {
  return JSON.stringify(block).length;
}

export function splitBlocksIntoChunks(blocks: RichTextBlock[], maxChunkSize: number = 15000): RichTextBlock[][] {
  const chunks: RichTextBlock[][] = [];
  let currentChunk: RichTextBlock[] = [];
  let currentSize = 0;
  
  for (const block of blocks) {
    const blockSize = getBlockSize(block);
    if (currentSize + blockSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [block];
      currentSize = blockSize;
    } else {
      currentChunk.push(block);
      currentSize += blockSize;
    }
  }
  
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [[]];
}

export function getWordCount(blocks: RichTextBlock[]): number {
  const plainText = blocksToPlainText(blocks);
  return plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function getCharacterCount(blocks: RichTextBlock[]): number {
  return blocksToPlainText(blocks).length;
}

export function searchInBlocks(blocks: RichTextBlock[], query: string) {
  const results: { blockId: string; blockIndex: number; matches: number }[] = [];
  const lowerQuery = query.toLowerCase();
  blocks.forEach((block, index) => {
    const text = getBlockText(block).toLowerCase();
    const matches = (text.match(new RegExp(lowerQuery, 'g')) || []).length;
    if (matches > 0) results.push({ blockId: block.id, blockIndex: index, matches });
  });
  return results;
}

export function replaceInBlocks(blocks: RichTextBlock[], searchText: string, replaceText: string): RichTextBlock[] {
  return blocks.map(block => {
    const text = getBlockText(block);
    const newText = text.replace(new RegExp(searchText, 'g'), replaceText);
    return text !== newText ? updateBlockText(block, newText) : block;
  });
}

export function validateBlock(block: RichTextBlock): boolean {
  if (!block.id || !block.type || !block.content) return false;
  switch (block.type) {
    case 'paragraph': return typeof (block.content as TextContent).text === 'string';
    case 'heading':
      const h = block.content as HeadingContent;
      return typeof h.text === 'string' && [1, 2, 3].includes(h.level);
    case 'list':
      const l = block.content as ListContent;
      return Array.isArray(l.items) && ['bullet', 'numbered'].includes(l.type);
    case 'table':
      const t = block.content as TableContent;
      return Array.isArray(t.cells) && t.rows > 0 && t.cols > 0;
    case 'math': return typeof (block.content as MathContent).latex === 'string';
    case 'divider': return true;
    default: return false;
  }
}

export function sanitizeBlocks(blocks: RichTextBlock[]): RichTextBlock[] {
  return blocks.filter(validateBlock);
}

export function getFormattingStats(blocks: RichTextBlock[]) {
  const stats = { bold: 0, italic: 0, underline: 0, strikethrough: 0, colored: 0 };
  blocks.forEach(block => {
    if (block.type === 'paragraph' || block.type === 'heading') {
      const content = block.content as TextContent | HeadingContent;
      (content.formatting || []).forEach(fmt => {
        fmt.styles.forEach(style => {
          if (style.type === 'bold') stats.bold++;
          else if (style.type === 'italic') stats.italic++;
          else if (style.type === 'underline') stats.underline++;
          else if (style.type === 'strikethrough') stats.strikethrough++;
          else if (style.type === 'color' || style.type === 'bgColor') stats.colored++;
        });
      });
    }
  });
  return stats;
}

export function getBlockSummary(block: RichTextBlock, maxLength: number = 50): string {
  const text = getBlockText(block);
  const typeLabel = block.type.charAt(0).toUpperCase() + block.type.slice(1);
  return text.length <= maxLength ? `${typeLabel}: ${text}` : `${typeLabel}: ${text.substring(0, maxLength)}...`;
}