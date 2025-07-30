import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Use the worker you placed in /public
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PdfViewer({ fileUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1); // Start a bit zoomed out

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));

  return (
    <div className="h-full flex flex-col items-center bg-gray-50">
      {/* Controls */}
      <div className="flex gap-2 items-center py-2">
        <button onClick={goToPrevPage} disabled={pageNumber === 1}>⬅️</button>
        <span>
          Page <b>{pageNumber}</b> / {numPages || '-'}
        </span>
        <button onClick={goToNextPage} disabled={pageNumber === numPages}>➡️</button>
        <button onClick={zoomOut}>➖</button>
        <span>Zoom</span>
        <button onClick={zoomIn}>➕</button>
      </div>
      {/* PDF */}
      <div className="overflow-auto flex-1 w-full flex justify-center">
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading="Loading PDF...">
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}
