import { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';

interface TextEditData {
  textId: string;
  content: string | string[];
  isMultiline: boolean;
  isTextPath: boolean;
}

export const useMobileTextEdit = () => {
  const [editData, setEditData] = useState<TextEditData | null>(null);
  const store = useEditorStore();

  // Detect if we're on mobile
  const isMobile = useCallback(() => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Start editing for any text type
  const startMobileEdit = useCallback((textId: string) => {
    
    // First, try to find in regular texts
    let textElement = store.texts.find(t => t.id === textId);
    let isTextPath = false;
    let isMultiline = false;
    let content: string | string[] = '';

    if (textElement) {
      // Regular text or multiline text
      if (textElement.type === 'text') {
        content = textElement.content;
        isMultiline = false;
      } else if (textElement.type === 'multiline-text') {
        // Convert spans to lines for editing
        content = textElement.spans.map(span => span.content);
        isMultiline = true;
      }
    } else {
      // Try textPaths
      const textPathElement = store.textPaths.find(tp => tp.id === textId);
      if (textPathElement) {
        isTextPath = true;
        content = textPathElement.content;
      } else {
        console.warn('📱 useMobileTextEdit: Text element not found:', textId);
        return false;
      }
    }

    setEditData({
      textId,
      content,
      isMultiline,
      isTextPath
    });

    return true;
  }, [store]);

  // Save changes
  const handleSave = useCallback((newContent: string | string[]) => {
    if (!editData) return;

    store.pushToHistory();

    if (editData.isTextPath) {
      // Update textPath
      store.updateTextPath(editData.textId, { content: newContent as string });
    } else if (editData.isMultiline) {
      // Update multiline text - convert lines back to spans
      const lines = newContent as string[];
      const spans = lines.map((line, index) => ({
        id: `span-${index}`,
        content: line,
        x: 0,
        dy: index === 0 ? 0 : 24 // Approximate line height in pixels
      }));
      store.updateMultilineText(editData.textId, { spans });
    } else {
      // Update regular text
      store.updateText(editData.textId, { content: newContent as string });
    }

    // Close modal
    setEditData(null);
  }, [editData, store]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditData(null);
  }, []);

  return {
    isMobile: isMobile(),
    editData,
    startMobileEdit,
    handleSave,
    handleCancel,
    isModalOpen: editData !== null
  };
};