import React, { useState, useRef, ChangeEvent } from 'react';
import { uploadMarkdownToSupabase, uploadFolderToSupabase } from '../lib/uploadMarkdown';
import { Button } from '@/components/ui/button';

// Add this interface at the top of your file
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

// Create a custom input component
const CustomFileInput = React.forwardRef<HTMLInputElement, CustomInputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

export function MarkdownUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reminder, setReminder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files or a folder');
      return;
    }

    setUploading(true);
    abortControllerRef.current = new AbortController();
    
    try {
      let result;
      if (files.length === 1) {
        result = await uploadMarkdownToSupabase(files[0], source || '', author || '', abortControllerRef.current.signal);
      } else {
        result = await uploadFolderToSupabase(files, source || '', author || '', abortControllerRef.current.signal);
      }

      if (result.success) {
        alert(result.message);
        setReminder(result.reminder ?? '');
        setFiles([]);
        setAuthor('');
        setSource('');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button onClick={() => fileInputRef.current?.click()}>
          Choose File
        </Button>
        <Button onClick={() => folderInputRef.current?.click()}>
          Choose Folder
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        onChange={handleFileChange}
        className="hidden"
      />
      <CustomFileInput
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderChange}
        className="hidden"
      />
      <input
        type="text"
        placeholder="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="block w-full p-2 border rounded"
      />
      <input
        type="text"
        placeholder="Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="block w-full p-2 border rounded"
      />
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
}