// client/src/pages/TestsCreation.jsx
import React, { useState } from "react";
import Header from "../components/Header";
import PDFUpload from "../components/PDFUpload";
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

const Steps = ["Upload PDF", "Configure", "Preview & Publish"];

export default function TestsCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [pdfUrl, setPdfUrl] = useState("");
  const [answerKeyUrl, setAnswerKeyUrl] = useState("");

  // Step 2 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [testMode, setTestMode] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [duration, setDuration] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});

  // Publish state
  const [shareLink, setShareLink] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Validation logic
  const validateStep = () => {
    let errs = {};
    if (step === 0) {
      if (!pdfUrl) errs.pdfUrl = "Questions PDF is required.";
    }
    if (step === 1) {
      if (!title) errs.title = "Test title is required.";
      if (!description) errs.description = "Description is required.";
      if (!type) errs.type = "Type is required.";
      if (!testMode) errs.testMode = "Mode is required.";
      if (!scheduledDate) errs.scheduledDate = "Scheduled date is required.";
      if (!duration || duration <= 0) errs.duration = "Duration must be positive.";
      if (!questionCount || questionCount <= 0) errs.questionCount = "Question count must be positive.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, Steps.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setPublishing(true);
    try {
      const payload = {
        title,
        description,
        type,
        testMode,
        scheduledDate,
        duration: Number(duration),
        questionCount: Number(questionCount),
        isPublic,
        pdfUrl,
        answerKeyUrl,
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

  // Preview card
  const PreviewCard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
        <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
        Test Preview
      </h3>
      <div className="mb-2">
        <span className="font-semibold">Title:</span> {title}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Description:</span>
        <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-line">{description}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <div>
          <span className="font-semibold">Type:</span> {type}
        </div>
        <div>
          <span className="font-semibold">Mode:</span> {testMode}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div>
          <span className="font-semibold">Scheduled Date:</span> {scheduledDate}
        </div>
        <div>
          <span className="font-semibold">Duration:</span> {duration} mins
        </div>
        <div>
          <span className="font-semibold">Questions:</span> {questionCount}
        </div>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Public:</span> {isPublic ? "Yes" : "No"}
      </div>
      <div className="flex items-center gap-2">
        <DocumentCheckIcon className="h-5 w-5 text-green-600" />
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
          Questions PDF
        </a>
        {answerKeyUrl && (
          <>
            <DocumentCheckIcon className="h-5 w-5 text-green-600" />
            <a href={answerKeyUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
              Answer Key PDF
            </a>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="pt-20 pb-12 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
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

          {/* Step 1: Upload PDFs */}
          {step === 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <PDFUpload
                label="Upload Questions PDF"
                onUpload={setPdfUrl}
              />
              {pdfUrl && (
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

              <PDFUpload
                label="Upload Answer Key (optional)"
                onUpload={setAnswerKeyUrl}
              />
              {answerKeyUrl && (
                <div className="flex items-center mt-2 text-green-600">
                  <DocumentCheckIcon className="h-5 w-5 mr-1" />
                  <span>Answer Key PDF uploaded</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 1 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Test Title
                </label>
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
                <label className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  rows={3}
                />
                {errors.description && (
                  <div className="flex items-center mt-1 text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {errors.description}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">
                    Type (e.g. Prelims)
                  </label>
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
                  <label className="block text-sm font-medium">
                    Mode (e.g. Practice)
                  </label>
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
                  <label className="block text-sm font-medium">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
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
                  <label className="block text-sm font-medium">
                    Duration (mins)
                  </label>
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
                  <label className="block text-sm font-medium">
                    # of Questions
                  </label>
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
                <label htmlFor="public" className="ml-2 block text-sm">
                  Make this test publicly available
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Publish */}
          {step === 2 && <PreviewCard />}

          {/* Share link screen */}
          {step === Steps.length && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <LinkIcon className="h-6 w-6 text-green-600" />
                Test Created!
              </h3>
              <div className="mb-2 text-green-700 dark:text-green-300">
                Share this link with your peers:
              </div>
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
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={publishing}
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
