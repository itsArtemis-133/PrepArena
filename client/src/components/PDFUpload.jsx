// client/src/components/PDFUpload.jsx
import React, { useState, useEffect } from "react";
import axios from "../api/axiosConfig";
import { DocumentCheckIcon, ExclamationCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function PDFUpload({
  label,
  onUpload,
  existingFile = null,
  existingUrl = "",
}) {
  const [file, setFile] = useState(existingFile);
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Sync with parent-provided state (on step navigation)
  useEffect(() => {
    setFile(existingFile);
    setUploadedUrl(existingUrl);
  }, [existingFile, existingUrl]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setProgress(0);
    setUploadedUrl("");
    setError("");
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setUploadedUrl(res.data.url);
      if (onUpload) onUpload(file, res.data.url);
    } catch {
      setError("Upload failed. Please try again.");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploadedUrl("");
    setProgress(0);
    setError("");
    if (onUpload) onUpload(null, "");
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {!uploadedUrl && (
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100"
        />
      )}
      {file && !uploadedUrl && !uploading && (
        <button
          onClick={uploadFile}
          className="mt-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Upload
        </button>
      )}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full">
          <div
            className="bg-blue-600 text-xs font-medium text-white text-center p-0.5 leading-none rounded-full"
            style={{ width: `${progress}%` }}
          >
            {progress}%
          </div>
        </div>
      )}
      {uploadedUrl && (
        <div className="flex items-center gap-2 mt-2 text-green-700 bg-green-50 dark:bg-green-900 p-2 rounded">
          <DocumentCheckIcon className="h-5 w-5 text-green-600" />
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700"
          >
            View PDF
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center text-xs text-red-600 hover:underline ml-4"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Replace File
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center mt-1 text-red-600 text-sm">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
}
