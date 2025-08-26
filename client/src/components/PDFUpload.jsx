import React, { useState, useEffect, useCallback } from "react";
import axios from "../api/axiosConfig";
import { useDropzone } from "react-dropzone";
import { DocumentCheckIcon, ExclamationCircleIcon, ArrowPathIcon, CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

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

  useEffect(() => {
    setFile(existingFile);
    setUploadedUrl(existingUrl);
  }, [existingFile, existingUrl]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setProgress(0);
      setUploadedUrl("");
      setError("");
      uploadFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const uploadFile = async (fileToUpload) => {
    if (!fileToUpload) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setUploadedUrl(res.data.url);
      if (onUpload) onUpload(fileToUpload, res.data.url);
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
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      
      {uploadedUrl ? (
        <div className="flex items-center gap-3 p-3 text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-800">
          <DocumentCheckIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div className="flex-grow">
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
              View Uploaded PDF
            </a>
            <p className="text-xs">{file?.name}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center text-sm text-red-600 hover:underline"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Replace
          </button>
        </div>
      ) : (
        <div {...getRootProps()} className={`relative group p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors duration-200 ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <CloudArrowUpIcon className="h-10 w-10 text-gray-400 group-hover:text-indigo-500" />
            {uploading ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Uploading...</p>
            ) : isDragActive ? (
              <p className="text-sm font-semibold text-indigo-600">Drop the file here...</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop a PDF
              </p>
            )}
          </div>
        </div>
      )}

      {uploading && !uploadedUrl && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && (
        <div className="flex items-center mt-2 text-sm text-red-500">
          <ExclamationCircleIcon className="h-4 w-4 mr-1.5" />
          {error}
        </div>
      )}
    </div>
  );
}