import React, { useState, useEffect, useCallback } from "react";
import axios from "../api/axiosConfig";
import { useDropzone } from "react-dropzone";
import {
  DocumentCheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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

  const onDrop = useCallback(async (acceptedFiles) => {
    const fileToUpload = acceptedFiles?.[0];
    setError("");

    if (!fileToUpload) return;
    if (fileToUpload.type !== "application/pdf" && !fileToUpload.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed");
      return;
    }

    setFile(fileToUpload);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      // 🔁 Use your actual upload route & shape
      const res = await axios.post("/upload/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });

      // { ok: true, file: { storedName, size, mimeType } }
      const storedName = res?.data?.file?.storedName || "";
      setUploadedUrl(storedName);
      if (onUpload) onUpload(fileToUpload, storedName);
    } catch {
      setError("Upload failed. Please try again.");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleRemove = () => {
    setFile(null);
    setUploadedUrl("");
    setProgress(0);
    setError("");
    if (onUpload) onUpload(null, "");
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition
          ${isDragActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-300 dark:border-gray-700"}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <CloudArrowUpIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {label || "Upload PDF"}
            </p>
            <p className="text-xs text-gray-500">
              {isDragActive ? "Drop the file here..." : "Drag & drop a PDF or click to select"}
            </p>
          </div>
          {uploading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-indigo-600" />
          ) : uploadedUrl ? (
            <DocumentCheckIcon className="h-5 w-5 text-emerald-600" />
          ) : null}
        </div>
      </div>

      {file && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <div className="truncate text-gray-700 dark:text-gray-200">{file.name}</div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <XMarkIcon className="h-4 w-4" />
            Remove
          </button>
        </div>
      )}

      {uploading && !uploadedUrl && (
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
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
