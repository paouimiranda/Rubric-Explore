// services/pdf-service.ts - EXPO COMPATIBLE VERSION

import { Note, NotebookProperty } from '@/app/types/notebook';
import { app } from '@/firebase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Alert } from 'react-native';

export interface PDFExportOptions {
  includeProperties?: boolean;
  includeMetadata?: boolean;
  fileName?: string;
}

export interface PDFImportResult {
  title: string;
  content: string;
  metadata?: {
    pages: number;
    characterCount: number;
    wordCount: number;
  };
}

export class PDFService {
  
  /**
   * Export a note to PDF (Expo compatible)
   */
  static async exportNoteToPDF(
    note: Note,
    content: string,
    options: PDFExportOptions = {}
  ): Promise<string | null> {
    try {
      const {
        includeProperties = true,
        includeMetadata = true,
        fileName = `${note.title || 'Untitled'}.pdf`
      } = options;

      // Ensure properties and tags are arrays
      const safeNote = {
        ...note,
        properties: note.properties || [],
        tags: note.tags || []
      };

      const htmlContent = this.buildHTMLForPDF(
        safeNote,
        content,
        includeProperties,
        includeMetadata
      );

      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      console.log('PDF generated:', uri);

      // Share the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Note as PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }

      return uri;
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Export Failed', 'Could not export note to PDF');
      return null;
    }
  }

  /**
   * Import PDF and extract text using Firebase Function
   */
  static async importPDFAsNote(): Promise<PDFImportResult | null> {
    try {
      // Step 1: Pick PDF file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const file = result.assets[0];
      const fileName = file.name?.replace('.pdf', '') || 'Imported Note';

      console.log('Selected PDF:', fileName);

      // Step 2: Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('PDF loaded, size:', base64Data.length, 'bytes');

      // Step 3: Check file size (Firebase has 10MB limit for callable functions)
      const sizeInMB = (base64Data.length * 0.75) / (1024 * 1024);
      
      if (sizeInMB > 9) {
        Alert.alert(
          'File Too Large',
          'PDF file is too large. Please select a PDF smaller than 9MB.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Step 4: Show loading alert
      Alert.alert(
        'Importing PDF',
        'Extracting text from PDF... This may take a moment.',
        [{ text: 'Cancel', style: 'cancel' }]
      );

      // Step 5: Call Firebase Function
      const functions = getFunctions(app);
      const extractPDFText = httpsCallable(functions, 'extractPDFText');

      console.log('Calling Firebase Function...');

      const response = await extractPDFText({
        base64Data: base64Data,
        fileName: fileName
      });

      const data = response.data as any;

      if (!data.success) {
        throw new Error('PDF extraction failed');
      }

      console.log('PDF text extracted successfully');
      console.log('Pages:', data.metadata.pages);
      console.log('Characters:', data.metadata.characterCount);

      // Step 6: Return formatted content
      return {
        title: fileName,
        content: data.htmlContent || `<p>${data.text}</p>`,
        metadata: data.metadata
      };

    } catch (error: any) {
      console.error('Error importing PDF:', error);

      // Handle specific errors
      if (error.name === 'DocumentPickerCancelledError') {
        // User cancelled, no alert needed
        return null;
      }

      // Show user-friendly error message
      let errorMessage = 'Could not import PDF file';
      
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to import PDFs';
      } else if (error.message?.includes('Failed to extract')) {
        errorMessage = 'Could not extract text from this PDF. It might be scanned or image-based. Try using OCR instead.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Import timed out. The PDF might be too large or complex.';
      }

      Alert.alert('Import Failed', errorMessage);
      return null;
    }
  }

  /**
   * Build HTML content for PDF export
   */
  private static buildHTMLForPDF(
    note: Note,
    content: string,
    includeProperties: boolean,
    includeMetadata: boolean
  ): string {
    const propertiesHTML = includeProperties && note.properties && note.properties.length > 0
      ? this.buildPropertiesHTML(note.properties)
      : '';

    const metadataHTML = includeMetadata
      ? this.buildMetadataHTML(note)
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${note.title || 'Untitled Note'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #1f2937;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            
            h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 24px;
              color: #111827;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 16px;
            }
            
            .properties {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
            }
            
            .properties h2 {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #374151;
            }
            
            .property-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .property-row:last-child {
              border-bottom: none;
            }
            
            .property-key {
              flex: 0 0 40%;
              font-weight: 500;
              color: #6b7280;
            }
            
            .property-value {
              flex: 1;
              color: #111827;
            }
            
            .metadata {
              background: #fef3c7;
              border: 1px solid #fde68a;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 24px;
              font-size: 12px;
              color: #92400e;
            }
            
            .metadata-item {
              margin-bottom: 4px;
            }
            
            .metadata-item:last-child {
              margin-bottom: 0;
            }
            
            .content {
              margin-top: 24px;
            }
            
            .content p {
              margin-bottom: 12px;
            }
            
            .content h1, .content h2, .content h3, 
            .content h4, .content h5, .content h6 {
              margin-top: 24px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            
            .content h1 { font-size: 28px; }
            .content h2 { font-size: 24px; }
            .content h3 { font-size: 20px; }
            .content h4 { font-size: 18px; }
            .content h5 { font-size: 16px; }
            .content h6 { font-size: 14px; }
            
            .content ul, .content ol {
              margin-left: 24px;
              margin-bottom: 12px;
            }
            
            .content li {
              margin-bottom: 6px;
            }
            
            .content blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 16px;
              margin: 16px 0;
              color: #6b7280;
              font-style: italic;
            }
            
            .content code {
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 13px;
            }
            
            .content pre {
              background: #1f2937;
              color: #f9fafb;
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
              margin: 16px 0;
            }
            
            .content pre code {
              background: transparent;
              padding: 0;
              color: inherit;
            }
            
            .content a {
              color: #3b82f6;
              text-decoration: underline;
            }
            
            .content img {
              max-width: 100%;
              height: auto;
              margin: 16px 0;
              border-radius: 8px;
            }
            
            .content table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }
            
            .content th, .content td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            
            .content th {
              background: #f9fafb;
              font-weight: 600;
            }
            
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <h1>${note.title || 'Untitled Note'}</h1>
          
          ${metadataHTML}
          ${propertiesHTML}
          
          <div class="content">
            ${content}
          </div>
        </body>
      </html>
    `;
  }

  private static buildPropertiesHTML(properties: NotebookProperty[]): string {
    const rows = properties.map(prop => `
      <div class="property-row">
        <div class="property-key">${this.escapeHtml(prop.key)}</div>
        <div class="property-value">${this.escapeHtml(prop.value)}</div>
      </div>
    `).join('');

    return `
      <div class="properties">
        <h2>Properties</h2>
        ${rows}
      </div>
    `;
  }

  private static buildMetadataHTML(note: Note): string {
    const tags = note.tags && note.tags.length > 0 
      ? `<div class="metadata-item"><strong>Tags:</strong> ${note.tags.join(', ')}</div>` 
      : '';

    return `
      <div class="metadata">
        <div class="metadata-item"><strong>Created:</strong> ${note.createdAt.toLocaleString()}</div>
        <div class="metadata-item"><strong>Last Updated:</strong> ${note.updatedAt.toLocaleString()}</div>
        <div class="metadata-item"><strong>Characters:</strong> ${note.totalCharacters || 0}</div>
        ${tags}
      </div>
    `;
  }

  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

export default PDFService;