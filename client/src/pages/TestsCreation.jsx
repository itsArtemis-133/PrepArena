// client/src/pages/TestsCreation.jsx
import React, { useState, useEffect, useRef } from "react"; // Import useRef
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";

import PDFUpload from "../components/PDFUpload";
import AnswerKeyStep from "../components/AnswerKeyStep";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  DocumentCheckIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  CloudArrowUpIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
  RocketLaunchIcon,
  XMarkIcon, // New Icon
  DocumentArrowUpIcon, // New Icon
} from "@heroicons/react/24/outline";

const Steps = [
  { name: "Upload Paper", icon: CloudArrowUpIcon },
  { name: "Answer Key", icon: ClipboardDocumentCheckIcon },
  { name: "Configure", icon: WrenchScrewdriverIcon },
  { name: "Preview & Publish", icon: EyeIcon },
];

const StepWrapper = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm">
    <div className="p-5 border-b border-gray-200 dark:border-gray-700/50 flex items-center gap-3">
      {React.createElement(icon, { className: "h-6 w-6 text-indigo-500" })}
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// --- FINAL FORM COMPONENTS ---
const FormInput = (props) => (
  <input
    {...props}
    className={`
      mt-2 block w-full text-base
      rounded-lg border-gray-400 bg-gray-50 dark:bg-gray-800 dark:border-gray-600
      px-4 py-2.5 
      placeholder:text-gray-400
      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
      transition duration-150 ease-in-out
      ${props.className || ''}
    `}
  />
);

const FormTextarea = (props) => (
  <textarea
    {...props}
    className={`
      mt-2 block w-full text-base
      rounded-lg border-gray-400 bg-gray-50 dark:bg-gray-800 dark:border-gray-600
      px-4 py-2.5 
      placeholder:text-gray-400
      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
      transition duration-150 ease-in-out
      ${props.className || ''}
    `}
  />
);

const FormLabel = ({ children }) => (
  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{children}</label>
);

export default function TestsCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Original state (kept for UI), plus filenames for secured storage.
  const [questionPdfFile, setQuestionPdfFile] = useState(null);
  const [questionPdfUrl, setQuestionPdfUrl] = useState(""); // kept for local preview text if needed
  const [questionPdfFilename, setQuestionPdfFilename] = useState("");

  const [answerKey, setAnswerKey] = useState({});
  const [questionCount, setQuestionCount] = useState("");

  const [answersPdfFile, setAnswersPdfFile] = useState(null);
  const [answersPdfUrl, setAnswersPdfUrl] = useState(""); // kept for UI
  const [answersPdfFilename, setAnswersPdfFilename] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [type, setType] = useState("");
  const [testMode, setTestMode] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [duration, setDuration] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState({});
  const [shareLink, setShareLink] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // --- NEW --- State and refs for the improved uploader UI
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const isStepValid = () => {
    if (step === 0) return !!(questionPdfFile || questionPdfUrl || questionPdfFilename);
    if (step === 1) {
      if (!questionCount || questionCount <= 0) return false;
      if (!answerKey || Object.keys(answerKey).length === 0) return false;
      return Object.keys(answerKey).length === Number(questionCount);
    }
    if (step === 2) {
      return !(
        !title ||
        !description ||
        !type ||
        !testMode ||
        !subject ||
        !scheduledDate ||
        !duration ||
        duration <= 0 ||
        !questionCount ||
        questionCount <= 0
      );
    }
    return true;
  };

  const validateStep = () => {
    let errs = {};
    if (step === 0) {
      if (!questionPdfFile && !questionPdfUrl && !questionPdfFilename) {
        errs.pdfUrl = "Questions PDF is required.";
      }
    }
    if (step === 1) {
      if (!questionCount || questionCount <= 0) errs.questionCount = "Question count required.";
      if (!answerKey || Object.keys(answerKey).length !== Number(questionCount))
        errs.answerKey = "Answer key count must match question count.";
    }
    if (step === 2) {
      if (!title) errs.title = "Test title is required.";
      if (!description) errs.description = "Description is required.";
      if (!type) errs.type = "Type is required.";
      if (!testMode) errs.testMode = "Mode is required.";
      if (!subject) errs.subject = "Subject is required.";
      if (!scheduledDate) errs.scheduledDate = "Scheduled date is required.";
      if (scheduledDate && new Date(scheduledDate) < new Date())
        errs.scheduledDate = "Date cannot be in the past.";
      if (!duration || duration <= 0) errs.duration = "Duration must be positive.";
      if (!questionCount || questionCount <= 0) errs.questionCount = "Question count must be positive.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    if (errors.answerKey && answerKey && Object.keys(answerKey).length === Number(questionCount)) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.answerKey;
        return n;
      });
    }
    if (errors.questionCount && questionCount && Number(questionCount) > 0) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.questionCount;
        return n;
      });
    }
  }, [answerKey, questionCount, errors.answerKey, errors.questionCount]);

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, Steps.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  // uploads return filenames (secured backend) or S3 keys
  const uploadPdfAndGetUrl = async (file) => {
    if (!file) return "";
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      // Use the new upload endpoint
      const res = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Return the URL/key for storage in database
      return res?.data?.url || "";
    } catch {
      return "";
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setPublishing(true);
    setErrors({});
    try {
      // Upload question paper if a file is provided and no filename yet
      let qFilename = questionPdfFilename;
      if (!qFilename && questionPdfFile) {
        qFilename = await uploadPdfAndGetUrl(questionPdfFile);
        setQuestionPdfFilename(qFilename);
      }
      if (!qFilename) {
        setErrors({ pdfUrl: "Failed to upload Questions PDF." });
        setPublishing(false);
        return;
      }

      // Upload official answers PDF (optional)
      let aFilename = answersPdfFilename;
      if (!aFilename && answersPdfFile) {
        aFilename = await uploadPdfAndGetUrl(answersPdfFile);
        setAnswersPdfFilename(aFilename);
      }

      const payload = {
        title,
        description,
        syllabus,
        type,
        testMode,
        scheduledDate,
        duration: Number(duration),
        questionCount: Number(questionCount),
        isPublic,
        subject,

        // ✅ secured storage fields
        pdfFilename: qFilename,
        answersPdfFilename: aFilename || "",

        // (back-compat: keep these keys if server still accepts them; they can be empty)
        pdfUrl: "",           // no public URL now
        answersPdfUrl: "",    // optional; secured flow uses filenames
        answerKey,
      };

      const res = await axios.post("/test", payload);
      // Share link stays the same
      setShareLink(`${window.location.origin}/test/${res.data.test.link}`);
      setStep(Steps.length);
    } catch {
      setErrors({ publish: "Failed to create test. Please try again." });
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const ErrorMessage = ({ name }) =>
    errors[name] && (
      <div className="flex items-center mt-2 text-sm text-red-500">
        <ExclamationCircleIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
        {errors[name]}
      </div>
    );
    
  // --- NEW --- Handlers for the improved uploader
  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      setQuestionPdfFile(selectedFile);
      setQuestionPdfUrl(selectedFile.name); // Use real filename for UI
      setQuestionPdfFilename(""); // This will be set on final submit
    } else {
      // Optional: handle wrong file type
      setErrors({ pdfUrl: "Please select a valid PDF file." });
    }
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const PreviewCard = () => (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <EyeIcon className="h-7 w-7 text-indigo-500" />
        <h3 className="text-xl font-bold">Review Your Test</h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700/50"></div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Title</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Description</p>
          <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{description}</p>
        </div>
        {syllabus && (
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Syllabus</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{syllabus}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div><p className="text-xs text-gray-500">Type</p><p className="font-semibold">{type}</p></div>
        <div><p className="text-xs text-gray-500">Mode</p><p className="font-semibold">{testMode}</p></div>
        <div><p className="text-xs text-gray-500">Duration</p><p className="font-semibold">{duration} mins</p></div>
        <div><p className="text-xs text-gray-500">Questions</p><p className="font-semibold">{questionCount}</p></div>
        <div><p className="text-xs text-gray-500">Subject</p><p className="font-semibold">{subject}</p></div>
        <div><p className="text-xs text-gray-500">Visibility</p><p className="font-semibold">{isPublic ? "Public" : "Private"}</p></div>
        <div className="col-span-2"><p className="text-xs text-gray-500">Scheduled</p><p className="font-semibold">{scheduledDate ? new Date(scheduledDate).toLocaleString() : ""}</p></div>
      </div>

      {/* Secured preview: show filenames instead of public links */}
      <div className="flex items-center gap-4 text-sm">
        <DocumentCheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="font-semibold text-gray-800 dark:text-gray-200">
          Questions PDF:{" "}
          <span className="text-gray-600 dark:text-gray-300">
            {questionPdfFilename || (questionPdfUrl ? "(selected)" : "—")}
          </span>
        </div>
        {answersPdfFile || answersPdfFilename ? (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              Official Answers PDF:{" "}
              <span className="text-gray-600 dark:text-gray-300">
                {answersPdfFilename || (answersPdfUrl ? "(selected)" : "—")}
              </span>
            </div>
          </>
        ) : null}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        PDFs are secured and delivered via protected routes. Students must be registered to access the paper.
      </p>
    </div>
  );

  return (
    <main className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 mb-10">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Create a New Test</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Follow the steps below to configure and publish your test.</p>
        </div>

        <div className="flex items-center mb-10">
          {Steps.map((s, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center flex-col">
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg transition-all duration-300 ${
                    idx === step
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110"
                      : idx < step
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {React.createElement(s.icon, { className: "h-5 w-5" })}
                </div>
                <span
                  className={`mt-2 text-xs font-bold text-center ${
                    idx === step ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500"
                  }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < Steps.length - 1 && (
                <div className={`flex-auto h-1 mx-4 rounded ${idx < step ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="min-h[400px]">
          {step === 0 && (
            <StepWrapper title="Step 1: Upload Question Paper" icon={CloudArrowUpIcon}>
              {/* --- NEW UPLOADER UI STARTS HERE --- */}
              <div>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {!questionPdfFile ? (
                  <div
                    onClick={() => fileInputRef.current.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`
                      flex flex-col items-center justify-center p-12
                      border-2 border-dashed rounded-xl 
                      text-center cursor-pointer transition-all duration-200
                      ${isDragging 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">
                      Drag & drop your PDF here
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      or <span className="text-indigo-600 dark:text-indigo-400 font-medium">click to browse</span>
                    </p>
                    <p className="mt-3 text-xs text-gray-400">PDF only, max 10MB</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DocumentCheckIcon className="h-7 w-7 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{questionPdfUrl}</p>
                        <p className="text-sm text-gray-500">
                          {(questionPdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setQuestionPdfFile(null);
                        setQuestionPdfUrl("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              {/* --- NEW UPLOADER UI ENDS HERE --- */}
              <ErrorMessage name="pdfUrl" />
            </StepWrapper>
          )}

          {step === 1 && (
            <StepWrapper title="Step 2: Provide Answer Key" icon={ClipboardDocumentCheckIcon}>
              <div className="space-y-6">
                <div>
                  <FormLabel>How many questions are in this test?</FormLabel>
                  <FormInput
                    type="number"
                    min={1}
                    max={999}
                    value={questionCount}
                    onChange={(e) => {
                      setQuestionCount(e.target.value);
                      if (Number(e.target.value) < Object.keys(answerKey).length) setAnswerKey({});
                    }}
                    className="w-24"
                  />
                  <ErrorMessage name="questionCount" />
                </div>

                <AnswerKeyStep
                  questionCount={Number(questionCount)}
                  onAnswerKeyReady={setAnswerKey}
                  answerKey={answerKey}
                  setAnswerKey={setAnswerKey}
                />
                <ErrorMessage name="answerKey" />

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700/50">
                  <PDFUpload
                    label="Official Answers PDF (Optional)"
                    onUpload={(file, storedName) => {
                      setAnswersPdfFile(file);
                      setAnswersPdfUrl(storedName);
                      setAnswersPdfFilename(storedName);
                    }}
                    existingFile={answersPdfFile}
                    existingUrl={answersPdfUrl}
                  />
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper title="Step 3: Configure Test Details" icon={WrenchScrewdriverIcon}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormLabel>Test Title</FormLabel>
                    <FormInput type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <ErrorMessage name="title" />
                  </div>
                  <div>
                    <FormLabel>Subject</FormLabel>
                    <FormInput type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    <ErrorMessage name="subject" />
                  </div>
                </div>

                <div>
                  <FormLabel>Description</FormLabel>
                  <FormTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="e.g., A full-length test covering modern history and polity..."
                  />
                  <ErrorMessage name="description" />
                </div>

                <div>
                  <FormLabel>Syllabus (Optional)</FormLabel>
                  <FormTextarea
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    rows={6}
                    placeholder={"e.g.,\n• Polity: Chapters 1-10\n• Economy: Budget highlights"}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormLabel>Type (e.g., Prelims)</FormLabel>
                    <FormInput type="text" value={type} onChange={(e) => setType(e.target.value)} />
                    <ErrorMessage name="type" />
                  </div>
                  <div>
                    <FormLabel>Mode (e.g., FLT, Sectional)</FormLabel>
                    <FormInput type="text" value={testMode} onChange={(e) => setTestMode(e.target.value)} />
                    <ErrorMessage name="testMode" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <FormInput
                      type="datetime-local"
                      value={scheduledDate}
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                    <ErrorMessage name="scheduledDate" />
                  </div>
                  <div>
                    <FormLabel>Duration (mins)</FormLabel>
                    <FormInput
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                    <ErrorMessage name="duration" />
                  </div>
                  <div>
                    <FormLabel># of Questions</FormLabel>
                    <FormInput
                      type="number"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                    />
                    <ErrorMessage name="questionCount" />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="public"
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="public"
                    className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Make this test publicly available
                  </label>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 3 && <PreviewCard />}

          {step === Steps.length && (
            <div className="text-center bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 p-8 rounded-2xl shadow-sm">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                <RocketLaunchIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mt-4 text-2xl font-bold">Test Published!</h3>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Share this link with participants to begin the test.
              </p>
              <div className="mt-6 max-w-lg mx-auto">
                <div className="flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <LinkIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 block w-full min-w-0 rounded-none bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium whitespace-nowrap"
                  >
                    {linkCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-8 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition"
              >
                Go to Dashboard
              </button>
              <ErrorMessage name="publish" />
            </div>
          )}
        </div>

        {step < Steps.length && (
          <div className="flex justify-between mt-10">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>
            {step < Steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                disabled={!isStepValid()}
              >
                Next
                <ChevronRightIcon className="h-5 w-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={publishing || uploading || !isStepValid()}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg shadow-green-500/20 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:scale-100"
              >
                {publishing ? "Publishing..." : "Publish Test"}
                <RocketLaunchIcon className="h-5 w-5 ml-2" />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}