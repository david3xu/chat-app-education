declare module 'pdf-parse' {
    interface PDFParseOptions {
        version?: string;
        buffer?: {
            isBuffer: (obj: any) => boolean;
            isArrayBuffer: (obj: any) => boolean;
            isArrayBufferView: (obj: any) => boolean;
        };
    }

    interface PDFParseResult {
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }

    function pdfParse(dataBuffer: Buffer | ArrayBuffer | Uint8Array, options?: PDFParseOptions): Promise<PDFParseResult>;

    export = pdfParse;
}
