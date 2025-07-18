import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface SVGDropZoneProps {
  onFileUpload: (file: File) => void;
  onSVGCodeDrop: (svgCode: string) => void;
  disabled?: boolean;
  className?: string;
}

export const SVGDropZone: React.FC<SVGDropZoneProps> = ({ 
  onFileUpload, 
  onSVGCodeDrop, 
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (!isDragOver) {
      setIsDragOver(true);
      setDragError(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag state to false if leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragError(null);
    }
  };

  const validateSVGFile = (file: File): boolean => {
    // Check file type
    const validTypes = ['image/svg+xml', 'text/xml', 'application/xml'];
    const hasValidType = validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.svg');
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    const validSize = file.size <= maxSize;
    
    if (!hasValidType) {
      setDragError('Please drop a valid SVG file');
      return false;
    }
    
    if (!validSize) {
      setDragError('File size must be less than 10MB');
      return false;
    }
    
    return true;
  };

  const validateSVGText = (text: string): boolean => {
    // Check if text contains SVG elements
    const hasSVGTag = text.includes('<svg') && text.includes('</svg>');
    const hasValidXML = text.startsWith('<') && text.endsWith('>');
    
    if (!hasSVGTag && !hasValidXML) {
      setDragError('Dropped text must be valid SVG code');
      return false;
    }
    
    return true;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragOver(false);
    setDragError(null);
    
    const files = Array.from(e.dataTransfer.files);
    const textData = e.dataTransfer.getData('text/plain');
    
    // Handle file drops
    if (files.length > 0) {
      const file = files[0];
      
      if (validateSVGFile(file)) {
        onFileUpload(file);
      }
      return;
    }
    
    // Handle text drops (SVG code)
    if (textData) {
      if (validateSVGText(textData)) {
        onSVGCodeDrop(textData);
      }
      return;
    }
    
    setDragError('No valid SVG file or code found');
  };

  const handleClick = () => {
    if (disabled) return;
    
    // Create a temporary file input to trigger file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml,text/xml,application/xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && validateSVGFile(file)) {
        onFileUpload(file);
      }
    };
    input.click();
  };

  const dropZoneStyle: React.CSSProperties = {
    border: '2px dashed',
    borderColor: dragError ? '#dc3545' : (isDragOver ? '#007bff' : '#dee2e6'),
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: disabled ? '#f8f9fa' : (isDragOver ? '#f8f9ff' : '#ffffff'),
    transition: 'all 0.2s ease',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    opacity: disabled ? 0.6 : 1
  };

  const iconStyle: React.CSSProperties = {
    color: dragError ? '#dc3545' : (isDragOver ? '#007bff' : '#6c757d'),
    transition: 'color 0.2s ease'
  };

  const textStyle: React.CSSProperties = {
    color: dragError ? '#dc3545' : (isDragOver ? '#007bff' : '#495057'),
    fontSize: '14px',
    fontWeight: '500',
    margin: 0
  };

  const hintStyle: React.CSSProperties = {
    color: '#6c757d',
    fontSize: '12px',
    margin: 0
  };

  return (
    <div
      ref={dropZoneRef}
      className={className}
      style={dropZoneStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {dragError ? (
        <>
          <AlertCircle size={32} style={iconStyle} />
          <p style={textStyle}>{dragError}</p>
        </>
      ) : isDragOver ? (
        <>
          <FileText size={32} style={iconStyle} />
          <p style={textStyle}>Drop SVG file or code here</p>
        </>
      ) : (
        <>
          <Upload size={32} style={iconStyle} />
          <p style={textStyle}>Drag & drop SVG files or code here</p>
          <p style={hintStyle}>or click to browse files</p>
        </>
      )}
    </div>
  );
};