import React, { useState, useRef, ChangeEvent } from 'react';
import { uploadMarkdownToSupabase, uploadFolderToSupabase } from '../lib/uploadMarkdown';
import { Button } from '@/components/ui/button';
import { FiMenu } from 'react-icons/fi'; // Import the icon

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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setReminder('');
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setReminder('You have selected a folder. Please review the files and click "Upload" to proceed.');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files or a folder');
      return;
    }

    setUploading(true);
    abortControllerRef.current = new AbortController();
    console.log('MarkdownUploader: Starting upload'); // Debug log

    try {
      let result;
      const defaultSource = source || 'default source';
      const defaultAuthor = author || 'default author';

      if (files.length === 1) {
        console.log('MarkdownUploader: Uploading single file', {
          file: files[0],
          source: defaultSource,
          author: defaultAuthor,
        }); // Debug log
        result = await uploadMarkdownToSupabase(files[0], defaultSource, defaultAuthor, abortControllerRef.current.signal);
      } else {
        console.log('MarkdownUploader: Uploading folder', {
          files,
          source: defaultSource,
          author: defaultAuthor,
        }); // Debug log
        result = await uploadFolderToSupabase(files, defaultSource, defaultAuthor, abortControllerRef.current.signal);
      }

      if (result.success) {
        alert(result.message);
        setReminder(result.reminder ?? '');
        resetForm();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('MarkdownUploader: Upload failed', error); // Debug log
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
      console.log('MarkdownUploader: Upload finished'); // Debug log
    }
  };

  const resetForm = () => {
    setFiles([]);
    setAuthor('');
    setSource('');
    setReminder('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="md:hidden p-2">
          <FiMenu className="h-6 w-6 text-white" /> {/* Use the alternative icon */}
        </Button>
        <div className="flex space-x-2">
          <Button onClick={() => fileInputRef.current?.click()}>
            Choose File
          </Button>
          <Button onClick={() => folderInputRef.current?.click()}>
            Choose Folder
          </Button>
        </div>
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
      {reminder && <div className="text-red-500">{reminder}</div>}
      {files.length > 0 && (
        <div>
          <h3>Selected Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
}