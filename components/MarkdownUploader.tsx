import React, { useState, useRef } from 'react';
import { uploadMarkdownToSupabase } from '../lib/uploadMarkdown';
import { Button } from '@/components/ui/button';

export function MarkdownUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reminder, setReminder] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await uploadMarkdownToSupabase(file, source || '', author || '', abortControllerRef.current.signal);
      if (result.success) {
        alert(result.message);
        setReminder(result.reminder ?? '');
        setFile(null);
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
      <input
        type="file"
        accept=".md"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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