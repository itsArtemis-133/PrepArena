// client/src/components/PdfViewer.jsx
import React from 'react';

export default function PdfViewer({ fileUrl }) {
  // Make sure URL is absolute for the object/embed
  const url =
    fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;

  return (
    <div className="w-full h-full bg-gray-50">
      <object
        data={url}
        type="application/pdf"
        className="w-full h-full"
      >
        <p className="text-center mt-4">
          Cannot display PDF.{' '}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Download instead
          </a>
        </p>
      </object>
    </div>
  );
}
