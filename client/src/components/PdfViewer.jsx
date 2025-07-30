import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PdfViewer({ fileUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));
  const jumpToPage = (e) => {
    let val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) setPageNumber(val);
  };

  return (
    <div className="h-full flex flex-col items-center bg-gray-50 rounded-lg shadow-lg border border-gray-200">
      {/* Controls (sticky!) */}
      <div className="flex gap-2 items-center py-3 px-4 sticky top-0 z-10 bg-gray-50 border-b w-full justify-center shadow-sm">
        <button
          className="rounded-full px-3 py-1 bg-gray-200 hover:bg-gray-300"
          onClick={goToPrevPage} disabled={pageNumber === 1}
        >⬅️</button>
        <span className="mx-2">
          Page
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={pageNumber}
            onChange={jumpToPage}
            className="mx-1 w-10 text-center border-b border-gray-400 outline-none bg-transparent"
            style={{ fontWeight: 600 }}
          />
          / {numPages || '-'}
        </span>
        <button
          className="rounded-full px-3 py-1 bg-gray-200 hover:bg-gray-300"
          onClick={goToNextPage} disabled={pageNumber === numPages}
        >➡️</button>
        <button
          className="rounded-full px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xl"
          onClick={zoomOut}
        >➖</button>
        <span className="mx-1 text-gray-500">Zoom</span>
        <button
          className="rounded-full px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xl"
          onClick={zoomIn}
        >➕</button>
        {/* Optional: Download Button */}
        {/* <a href={fileUrl} download className="ml-6 px-2 py-1 rounded text-blue-600 hover:underline">Download PDF</a> */}
      </div>
      {/* PDF */}
      <div className="overflow-auto flex-1 w-full flex justify-center pb-2">
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
