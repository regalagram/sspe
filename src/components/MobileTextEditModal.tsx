import React, { useRef, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

interface MobileTextEditModalProps {
  textId: string;
  initialContent: string | string[];
  isMultiline?: boolean;
  onSave: (newContent: string | string[]) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const MobileTextEditModal: React.FC<MobileTextEditModalProps> = ({
  textId,
  initialContent,
  isMultiline = false,
  onSave,
  onCancel,
  isVisible
}) => {
  const [content, setContent] = useState(() => {
    return Array.isArray(initialContent) ? initialContent.join('\n') : initialContent;
  });
  
  const [backdropClickEnabled, setBackdropClickEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Enable backdrop click after a delay to prevent immediate closure
  useEffect(() => {
    if (isVisible) {
      // Disable backdrop click initially
      console.log('📱 MobileTextEditModal: Modal opened, disabling backdrop click temporarily');
      setBackdropClickEnabled(false);
      
      // Enable backdrop click after a delay
      const timer = setTimeout(() => {
        console.log('📱 MobileTextEditModal: Enabling backdrop click after delay');
        setBackdropClickEnabled(true);
      }, 300); // 300ms delay to prevent immediate closure
      
      return () => clearTimeout(timer);
    } else {
      setBackdropClickEnabled(false);
    }
  }, [isVisible]);

  // Auto-focus when modal becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Handle save
  const handleSave = () => {
    if (isMultiline && Array.isArray(initialContent)) {
      // For multiline text, split by newlines
      const lines = content.split('\n');
      onSave(lines);
    } else {
      onSave(content);
    }
  };

  // Handle key shortcuts
  // Handle cancel
  const handleCancel = () => {
    console.log('📱 MobileTextEditModal: handleCancel called');
    onCancel();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    console.log('📱 MobileTextEditModal: backdrop clicked', { 
      backdropClickEnabled, 
      timeStamp: e.timeStamp 
    });
    
    if (!backdropClickEnabled) {
      console.log('📱 MobileTextEditModal: backdrop click ignored (too early)');
      return;
    }
    
    e.stopPropagation();
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isMultiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && e.ctrlKey && isMultiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isVisible) return null;

  console.log('📱 MobileTextEditModal: Rendering modal', { isVisible, textId });

  return (
    <div className="mobile-text-edit-modal">
      {/* Backdrop */}
      <div 
        className="modal-backdrop"
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {/* Modal Content */}
        <div 
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #000',
            padding: '20px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <h3 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#000'
          }}>
            Edit Text
          </h3>
          
          {/* Input/Textarea */}
          {isMultiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your text..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '8px',
                border: '1px solid #000',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: 'white',
                color: '#000',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#000';
                e.target.style.borderWidth = '2px';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#000';
                e.target.style.borderWidth = '1px';
              }}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your text..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #000',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: 'white',
                color: '#000',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#000';
                e.target.style.borderWidth = '2px';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#000';
                e.target.style.borderWidth = '1px';
              }}
            />
          )}
          
          {/* Helper text - simplified for mobile */}
          <p style={{ 
            margin: '8px 0 20px 0', 
            fontSize: '14px', 
            color: '#000',
            lineHeight: '1.4'
          }}>
            Tap Save when finished
          </p>
          
          {/* Action buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end' 
          }}>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                border: '1px solid #000',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#000',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                border: '1px solid #000',
                borderRadius: '4px',
                backgroundColor: '#000',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000';
              }}
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};