import { createHash } from 'crypto';
import { supabase } from './supabase';

const MAX_FILE_SIZE = 100 * 1024; // 100KB

export async function uploadMarkdownToSupabase(file: File, source: string, author: string, abortSignal: AbortSignal) {
  try {
    const fileContent = await file.text();
    const hash = createHash('md5').update(fileContent).digest('hex');

    console.log(`uploadMarkdownToSupabase: Uploading ${file.name} with size ${file.size} and hash ${hash}`); // Debug log

    if (file.size > MAX_FILE_SIZE) {
      console.log('uploadMarkdownToSupabase: File size exceeds max limit, using API route'); // Debug log
      const response = await fetch('/api/uploadMarkdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          source,
          author,
          fileName: file.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('uploadMarkdownToSupabase: API route error', result.error); // Debug log
        throw new Error(result.error || 'Unknown error');
      }
    } else {
      console.log('uploadMarkdownToSupabase: File size within limit, uploading directly to Supabase'); // Debug log
      const { error } = await supabase
        .from('documents')
        .insert({
          source,
          source_id: hash,
          content: fileContent,
          document_id: file.name,
          author,
          url: file.name,
        });

      if (error) throw error;
    }

    return { 
      success: true, 
      message: 'File uploaded successfully', 
      reminder: 'Remember to check the uploaded content in Supabase!'
    };
  } catch (error) {
    console.error('uploadMarkdownToSupabase: Detailed error', error); // Debug log
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function uploadFolderToSupabase(files: File[], source: string, author: string, abortSignal: AbortSignal) {
  try {
    let totalUploaded = 0;
    const errors = [];

    for (const file of files) {
      if (abortSignal.aborted) {
        throw new Error('Upload cancelled');
      }

      if (file.name.endsWith('.md')) {
        const result = await uploadMarkdownToSupabase(file, source, author, abortSignal);
        if (result.success) {
          totalUploaded++;
        } else {
          errors.push(`Failed to upload ${file.name}: ${result.error}`);
        }
      }
    }

    if (errors.length > 0) {
      console.error('Errors during folder upload:', errors);
    }

    return { 
      success: true, 
      message: `Uploaded ${totalUploaded} files successfully. ${errors.length} files failed.`, 
      reminder: 'Remember to check the uploaded content in Supabase!'
    };
  } catch (error) {
    console.error('Detailed error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

