import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  console.log('file', file);

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfParser = new PDFParser();

    const text = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        const text = pdfParser.getRawTextContent();
        resolve(text);
      });

      pdfParser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
  } catch (error) {
    const err = error as Error;
    console.error('Error converting PDF:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}