import React, { useState, useRef, ChangeEvent } from 'react';
import { uploadMarkdownToSupabase, uploadFolderToSupabase } from '../lib/uploadMarkdown';
import { Button } from '@/components/ui/button';
import { FiMenu } from 'react-icons/fi'; // Import the icon
import { dominationFieldsData } from '../lib/data/domFields';
import { isPdfFile } from '../lib/utils';

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
  const [dominationField, setDominationField] = useState(''); // New state for domination field
  const [uploading, setUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reminder, setReminder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => 
        file.type === 'text/markdown' || 
        file.name.toLowerCase().endsWith('.md') || 
        isPdfFile(file)
      );
      setFiles(validFiles);
      setReminder(validFiles.length < selectedFiles.length ? 'Some files were ignored. Only Markdown (.md) and PDF files are accepted.' : '');
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => file.type === 'text/markdown' || isPdfFile(file));
      setFiles(validFiles);
      setReminder('You have selected a folder. Only Markdown and PDF files will be processed. Please review the files and click "Upload" to proceed.');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select files or a folder');
      return;
    }

    if (!dominationField) {
      setError('Please select a domination field');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const defaultSource = source || 'default source';
      const defaultAuthor = author || 'default author';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Processing file ${i + 1} of ${files.length}: ${file.name}`);

        if (file.type === 'application/pdf') {
          setUploadStatus(`Converting PDF to Markdown: ${file.name}`);
          // Add a delay to ensure the status message is displayed
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await uploadMarkdownToSupabase(
          file,
          defaultSource,
          defaultAuthor,
          dominationField,
          abortControllerRef.current.signal,
          (progress) => {
            setUploadProgress(progress);
            setUploadStatus(`Uploading ${file.name}: ${progress.toFixed(2)}%`);
          }
        );

        if (result.success) {
          setUploadStatus(`Successfully uploaded: ${file.name}`);
        } else {
          throw new Error(result.error || 'Unknown error');
        }

        setUploadProgress((i + 1) / files.length * 100);
      }

      alert('All files uploaded successfully');
      setReminder('Remember to check the uploaded content in Supabase!');
      resetForm();
    } catch (error) {
      console.error('MarkdownUploader: Upload failed', error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const resetForm = () => {
    setFiles([]);
    setAuthor('');
    setSource('');
    setDominationField(''); // Reset domination field
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
        accept=".md,.pdf,text/markdown,application/pdf"
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
      <div className="relative">
        <select
          value={dominationField}
          onChange={(e) => setDominationField(e.target.value)}
          className="block w-full p-2 border rounded"
        >
          <option value="" disabled>Select Domination Field</option>
          {dominationFieldsData.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
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
      {uploading && (
        <div>
          <div className="text-blue-500">{uploadStatus}</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{width: `${uploadProgress}%`}}
            ></div>
          </div>
        </div>
      )}
      {!uploading && error && <div className="text-red-500">{error}</div>}
      {!uploading && reminder && <div className="text-green-500">{reminder}</div>}
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
