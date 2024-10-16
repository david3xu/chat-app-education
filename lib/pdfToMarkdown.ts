// import { pdfjs } from "react-pdf";
// import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";


import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const convertPdfToMarkdown = async (file: File): Promise<string> => {
  try {
    console.log('Starting PDF conversion');
    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into ArrayBuffer');
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF document loaded');
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n\n';
    }

    console.log('PDF conversion completed');
    
    if (text.trim().length === 0) {
      console.warn('Warning: Extracted text is empty');
      return '';
    }

    console.log('Extracted PDF content (first 100 characters):');
    console.log(text.substring(0, 100) + '...');
    
    console.log(`Total extracted text length: ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('Error converting PDF to Markdown:', error);
    throw error;
  }
}
