import React, { useState, useEffect } from "react";

import PDFUpload from "../components/PDFUpload";
import AnswerKeyStep from "../components/AnswerKeyStep";
import axios from "../api/axiosConfig";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  DocumentCheckIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const Steps = [
  "Upload Questions PDF",
  "Extract Answer Key",
  "Configure",
  "Preview & Publish",
];

export default function TestsCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // --- Step 1: Question PDF Upload ---
  const [questionPdfFile, setQuestionPdfFile] = useState(null);
  const [questionPdfUrl, setQuestionPdfUrl] = useState("");

  // --- Step 2: Answer Key Extraction + Official Answers PDF (optional) ---
  const [answerKey, setAnswerKey] = useState({});
  const [questionCount, setQuestionCount] = useState("");
  const [answersPdfFile, setAnswersPdfFile] = useState(null);
  const [answersPdfUrl, setAnswersPdfUrl] = useState("");

  // --- Step 3: Test Configuration ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");        // 👈 NEW
  const [type, setType] = useState("");
  const [testMode, setTestMode] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [duration, setDuration] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [subject, setSubject] = useState("");

  // --- UI State ---
  const [errors, setErrors] = useState({});
  const [shareLink, setShareLink] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Step validation for enabling/disabling "Next" button
  const isStepValid = () => {
    if (step === 0) {
      return !!(questionPdfFile || questionPdfUrl);
    }
    if (step === 1) {
      if (!questionCount || questionCount <= 0) return false;
      if (!answerKey || Object.keys(answerKey).length === 0) return false;
      if (Object.keys(answerKey).length !== Number(questionCount)) return false;
      return true;
    }
    if (step === 2) {
      if (!title) return false;
      if (!description) return false;
      if (!type) return false;
      if (!testMode) return false;
      if (!subject) return false;
      if (!scheduledDate) return false;
      if (!duration || duration <= 0) return false;
      if (!questionCount || questionCount <= 0) return false;
      // syllabus & answersPdf are optional
      return true;
    }
    return true;
  };

  // Show error on Next/back if not valid
  const validateStep = () => {
    let errs = {};
    if (step === 0) {
      if (!questionPdfFile && !questionPdfUrl) errs.pdfUrl = "Questions PDF is required.";
    }
    if (step === 1) {
      if (!questionCount || questionCount <= 0) errs.questionCount = "Question count required before extracting.";
      if (!answerKey || Object.keys(answerKey).length === 0)
        errs.answerKey = "Extract and review the answer key.";
      if (Object.keys(answerKey).length !== Number(questionCount))
        errs.answerKey = "Answer key count does not match question count.";
      // Official Answers PDF is optional — no error here
    }
    if (step === 2) {
      if (!title) errs.title = "Test title is required.";
      if (!description) errs.description = "Description is required.";
      if (!type) errs.type = "Type is required.";
      if (!testMode) errs.testMode = "Mode is required.";
      if (!subject) errs.subject = "Subject is required.";
      if (!scheduledDate) errs.scheduledDate = "Scheduled date/time is required.";
      if (scheduledDate && new Date(scheduledDate) < new Date())
        errs.scheduledDate = "Scheduled date/time cannot be in the past.";
      if (!duration || duration <= 0) errs.duration = "Duration must be positive.";
      if (!questionCount || questionCount <= 0) errs.questionCount = "Question count must be positive.";
      // syllabus is optional
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Instantly clear the "answer key count mismatch" error if fixed
  useEffect(() => {
    if (
      errors.answerKey &&
      answerKey &&
      Object.keys(answerKey).length === Number(questionCount)
    ) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs.answerKey;
        return newErrs;
      });
    }
    if (errors.questionCount && questionCount && Number(questionCount) > 0) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs.questionCount;
        return newErrs;
      });
    }
  }, [answerKey, questionCount, errors.answerKey, errors.questionCount]);

  // Step Navigation
  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, Steps.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  // Upload file and get URL (shared)
  const uploadPdfAndGetUrl = async (file) => {
    if (!file) return "";
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return "";
    } finally {
      setUploading(false);
    }
  };

  // Submit the test for publishing
  const handleSubmit = async () => {
    setPublishing(true);
    setErrors({});
    try {
      // Ensure questions PDF is uploaded
      let uploadedQuestionUrl = questionPdfUrl;
      if (questionPdfFile && !questionPdfUrl) {
        uploadedQuestionUrl = await uploadPdfAndGetUrl(questionPdfFile);
        setQuestionPdfUrl(uploadedQuestionUrl);
      }
      if (!uploadedQuestionUrl) {
        setErrors({ pdfUrl: "Failed to upload Questions PDF." });
        setPublishing(false);
        return;
      }

      // Upload official answers PDF if provided
      let uploadedAnswersUrl = answersPdfUrl;
      if (answersPdfFile && !answersPdfUrl) {
        uploadedAnswersUrl = await uploadPdfAndGetUrl(answersPdfFile);
        setAnswersPdfUrl(uploadedAnswersUrl);
      }

      const payload = {
        title,
        description,
        syllabus,                 // 👈 NEW
        type,
        testMode,
        scheduledDate,
        duration: Number(duration),
        questionCount: Number(questionCount),
        isPublic,
        pdfUrl: uploadedQuestionUrl,
        answerKey,
        subject,
        answersPdfUrl: uploadedAnswersUrl || "",  // 👈 NEW
      };

      const res = await axios.post("/test", payload);
      setShareLink(`${window.location.origin}/tests/${res.data.test.link}/take`);
      setStep(Steps.length); // Move to share link screen
    } catch {
      setErrors({ publish: "Failed to create test. Please try again." });
    } finally {
      setPublishing(false);
    }
  };

  // --- UI Render ---
  const PreviewCard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
        <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
        Test Preview
      </h3>

      <div className="mb-2"><span className="font-semibold">Title:</span> {title}</div>

      <div className="mb-2">
        <span className="font-semibold">Description:</span>
        <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{description}</div>
      </div>

      {syllabus && (
        <div className="mb-2">
          <span className="font-semibold">Syllabus:</span>
          <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{syllabus}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <div><span className="font-semibold">Type:</span> {type}</div>
        <div><span className="font-semibold">Mode:</span> {testMode}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div><span className="font-semibold">Scheduled Date:</span> {scheduledDate}</div>
        <div><span className="font-semibold">Duration:</span> {duration} mins</div>
        <div><span className="font-semibold">Questions:</span> {questionCount}</div>
      </div>
      <div className="mb-2"><span className="font-semibold">Public:</span> {isPublic ? "Yes" : "No"}</div>

      <div className="mb-2">
        <span className="font-semibold">Answer Key Sample:</span>{" "}
        {answerKey && (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {Object.entries(answerKey)
              .slice(0, 10)
              .map(([q, a]) => `${q}:${a}`)
              .join(", ")}
            {Object.keys(answerKey).length > 10 ? "..." : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DocumentCheckIcon className="h-5 w-5 text-green-600" />
        {questionPdfUrl && (
          <a href={questionPdfUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
            Questions PDF
          </a>
        )}
        {answersPdfUrl && (
          <>
            <span className="opacity-60">•</span>
            <a href={answersPdfUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
              Official Answers PDF
            </a>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <main className="pt-4 pb-12 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          {/* Back to Dashboard */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-blue-600 hover:underline mb-2"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Dashboard
          </button>

          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {Steps.map((label, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center">
                  <div
                    className={
                      "w-8 h-8 flex items-center justify-center rounded-full font-bold " +
                      (idx === step
                        ? "bg-blue-600 text-white"
                        : idx < step
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-600")
                    }
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={
                      "ml-2 text-sm font-medium " +
                      (idx === step
                        ? "text-blue-600"
                        : idx < step
                        ? "text-green-600"
                        : "text-gray-500")
                    }
                  >
                    {label}
                  </span>
                </div>
                {idx < Steps.length - 1 && (
                  <div
                    className="flex-auto border-t-2 mx-4"
                    style={{
                      borderColor:
                        idx < step
                          ? "#10B981"
                          : idx === step
                          ? "#3B82F6"
                          : "#D1D5DB",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Upload Questions PDF */}
          {step === 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <PDFUpload
                label="Upload Questions PDF"
                onUpload={(file, url) => {
                  setQuestionPdfFile(file);
                  setQuestionPdfUrl(url);
                }}
                existingFile={questionPdfFile}
                existingUrl={questionPdfUrl}
              />
              {questionPdfUrl && (
                <div className="flex items-center mt-2 text-green-600">
                  <DocumentCheckIcon className="h-5 w-5 mr-1" />
                  <span>Questions PDF uploaded</span>
                </div>
              )}
              {errors.pdfUrl && (
                <div className="flex items-center mt-2 text-red-600 text-sm">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.pdfUrl}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Extract Answer Key + Official Answers PDF (optional) */}
          {step === 1 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <div className="mb-2">
                <label className="block text-sm font-medium">How many questions?</label>
                <input
                  type="number"
                  min={1}
                  value={questionCount}
                  onChange={(e) => {
                    setQuestionCount(e.target.value);
                    if (Number(e.target.value) < Object.keys(answerKey).length) {
                      setAnswerKey({});
                    }
                  }}
                  className="mt-1 w-24 p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
                {errors.questionCount && (
                  <div className="flex items-center mt-1 text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {errors.questionCount}
                  </div>
                )}
              </div>

              <AnswerKeyStep
                questionCount={questionCount}
                onAnswerKeyReady={setAnswerKey}
                answerKey={answerKey}
                setAnswerKey={setAnswerKey}
              />
              {errors.answerKey && (
                <div className="flex items-center mt-2 text-red-600 text-sm">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.answerKey}
                </div>
              )}

              {/* Optional Official Answers PDF */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-1">Official Answers PDF (optional)</label>
                <PDFUpload
                  label="Upload Official Answers PDF"
                  onUpload={(file, url) => {
                    setAnswersPdfFile(file);
                    setAnswersPdfUrl(url);
                  }}
                  existingFile={answersPdfFile}
                  existingUrl={answersPdfUrl}
                />
                {answersPdfUrl && (
                  <div className="flex items-center mt-2 text-green-600 text-sm">
                    <DocumentCheckIcon className="h-5 w-5 mr-1" />
                    <a href={answersPdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      View uploaded Official Answers
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 2 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Test Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.title && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.title}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.subject && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.subject}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  rows={4}
                  placeholder={`Brief overview, rules, and focus areas.
Use line breaks and bullets:
• Paper I focus
• Budget/Eco Survey themes
• PYQ emphasis`}
                />
                {errors.description && (
                  <div className="flex items-center mt-1 text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {errors.description}
                  </div>
                )}
              </div>

              {/* NEW: Syllabus textarea */}
              <div>
                <label className="block text-sm font-medium">Syllabus (optional)</label>
                <textarea
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  rows={6}
                  placeholder={`Paste sections or bullet points:
• Polity – Laxmikanth Ch.1–10
• Economy – Budget & Survey highlights
• Environment – Basics + PYQs`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Type (e.g. Prelims)</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.type && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.type}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Mode (e.g. FLT, HLT)</label>
                  <input
                    type="text"
                    value={testMode}
                    onChange={(e) => setTestMode(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.testMode && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.testMode}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.scheduledDate && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.scheduledDate}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Duration (mins)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.duration && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.duration}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium"># of Questions</label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {errors.questionCount && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {errors.questionCount}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center mt-2">
                <input
                  id="public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="public" className="ml-2 block text-sm">Make this test publicly available</label>
              </div>
            </div>
          )}

          {/* Step 4: Preview & Publish */}
          {step === 3 && <PreviewCard />}

          {/* Share link screen */}
          {step === Steps.length && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <LinkIcon className="h-6 w-6 text-green-600" />
                Test Created!
              </h3>
              <div className="mb-2 text-green-700 dark:text-green-300">Share this link with your peers:</div>
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900 rounded">
                <LinkIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm break-all">{shareLink}</span>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
              {errors.publish && (
                <div className="flex items-center mt-2 text-red-600 text-sm">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.publish}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {step < Steps.length && (
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Back
              </button>
              {step < Steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={!isStepValid()}
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={publishing || uploading || !isStepValid()}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {publishing ? "Publishing..." : "Publish Test"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
