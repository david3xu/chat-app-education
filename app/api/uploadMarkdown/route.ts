import { NextResponse } from 'next/server';
import { uploadLargeFileToSupabase } from '@/lib/uploadLargeFile';
import { createHash } from 'crypto';

export async function POST(req: Request) {
  console.log('API Route: Received request'); // Debug log
  const { fileContent, source, author, fileName, domination_field: dominationField } = await req.json();
  console.log('API Route: Request body', { fileContent, source, author, fileName, dominationField }); // Debug log

  if (!fileContent || !source || !author || !fileName || !dominationField) {
    console.error('API Route: Missing required fields'); // Debug log
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const hash = createHash('md5').update(fileContent).digest('hex');
  console.log(`API Route: Generated hash ${hash}`); // Debug log

  try {
    console.log('API Route: Starting file upload'); // Debug log
    await uploadLargeFileToSupabase(fileContent, source, author, fileName, hash, dominationField, new AbortController().signal);
    console.log('API Route: File uploaded successfully'); // Debug log
    return NextResponse.json({ success: true, message: 'File uploaded successfully' });
  } catch (error) {
    const err = error as Error; // Type assertion
    console.error('API Route: Upload failed', err); // Debug log
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
