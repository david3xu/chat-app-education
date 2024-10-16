import { createHash } from 'crypto';
import { supabase } from './supabase';
import { getTextChunks, getEmbeddings } from './uploadLargeFile';
import { convertPdfToMarkdown } from './pdfToMarkdown';

const MAX_FILE_SIZE = 100 * 1024; // 100KB

export async function uploadMarkdownToSupabase(
  file: File,
  source: string,
  author: string,
  dominationField: string,
  abortSignal: AbortSignal,
  onProgress: (progress: number) => void
) {
  try {
    let fileContent: string;
    let fileSize = file.size;
    onProgress(0);

    if (file.type === 'application/pdf') {
      try {
        onProgress(10);
        fileContent = await convertPdfToMarkdown(file);
        fileSize = new Blob([fileContent]).size; // Get size of converted content
        onProgress(20);
      } catch (error) {
        console.error('Error converting PDF:', error);
        throw new Error(`Failed to convert PDF to Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      fileContent = await file.text();
      onProgress(20);
    }

    const hash = createHash('md5').update(fileContent).digest('hex');
    onProgress(30);

    console.log(`uploadMarkdownToSupabase: Uploading ${file.name} with size ${fileSize} and hash ${hash}`);

    if (fileSize > MAX_FILE_SIZE) {
      console.log('uploadMarkdownToSupabase: File size exceeds max limit, using API route'); // Debug log
      console.log('Sending to API route:', { fileContent, source, author, domination_field: dominationField, fileName: file.name });
      const response = await fetch('/api/uploadMarkdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          source,
          author,
          domination_field: dominationField, // Change this line
          fileName: file.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('uploadMarkdownToSupabase: API route error', result.error); // Debug log
        throw new Error(result.error || 'Unknown error');
      }
      onProgress(100);
    } else {
      console.log('uploadMarkdownToSupabase: File size within limit, uploading directly to Supabase');

      const chunks = getTextChunks(fileContent);
      console.log(`Generated ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbeddings([chunks[i]]);
        
        if (!embedding[0]) {
          console.error(`No embedding for chunk ${i}`);
          continue;
        }

        const { error } = await supabase
          .from('documents')
          .insert({
            source,
            source_id: `${hash}-${i}`,
            content: chunks[i],
            document_id: `${file.name}-part${i + 1}`,
            author,
            domination_field: dominationField,
            url: file.name,
            embedding: embedding[0],
          });

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }

        onProgress(30 + (70 * (i + 1) / chunks.length));
      }
    }

    return { 
      success: true, 
      message: 'File uploaded successfully', 
      reminder: 'Remember to check the uploaded content in Supabase!'
    };
  } catch (error) {
    console.error('uploadMarkdownToSupabase: Detailed error', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function uploadFolderToSupabase(files: File[], source: string, author: string, dominationField: string, abortSignal: AbortSignal) {
  try {
    let totalUploaded = 0;
    const errors = [];

    let totalProgress = 0;
    const onProgress = (progress: number) => {
      totalProgress += progress / files.length;
      console.log(`Total folder upload progress: ${totalProgress.toFixed(2)}%`);
    };

    for (const file of files) {
      if (abortSignal.aborted) {
        throw new Error('Upload cancelled');
      }

      if (file.name.endsWith('.md')) {
        const result = await uploadMarkdownToSupabase(file, source, author, dominationField, abortSignal, onProgress);
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
