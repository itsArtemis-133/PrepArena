// client/src/pages/TestsCreation.jsx
import React, { useState } from "react";
import Header from "../components/Header";
import PDFUpload from "../components/PDFUpload";
import axios from "../api/axiosConfig";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const Steps = ["Upload PDF", "Configure & Publish"];

export default function TestsCreation() {
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

  const [shareLink, setShareLink] = useState("");

  const handleNext = () =>
    setStep((s) => Math.min(s + 1, Steps.length - 1));
  const handleBack = () =>
    setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
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
      setShareLink(
        `${window.location.origin}/tests/${res.data.test.link}/take`
      );
      handleNext();
    } catch (err) {
      console.error(err);
      alert("Failed to create test");
    }
  };

  return (
    <>
      <Header />

      <main className="pt-20 pb-12 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          {/* Step indicator */}
          <div className="flex items-center">
            {Steps.map((label, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center">
                  <div
                    className={
                      "w-8 h-8 flex items-center justify-center rounded-full " +
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <PDFUpload
                label="Upload Questions PDF"
                onUpload={setPdfUrl}
              />
              {pdfUrl && (
                <p className="mt-2 text-sm text-green-600 break-all">
                  PDF URL:{" "}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {pdfUrl}
                  </a>
                </p>
              )}

              <div className="mt-6">
                <PDFUpload
                  label="Upload Answer Key (optional)"
                  onUpload={setAnswerKeyUrl}
                />
                {answerKeyUrl && (
                  <p className="mt-2 text-sm text-green-600 break-all">
                    Key URL:{" "}
                    <a
                      href={answerKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {answerKeyUrl}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Configure & Publish */}
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
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                />
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
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Mode (e.g. Practice)
                  </label>
                  <input
                    type="text"
                    value={testMode}
                    onChange={(e) =>
                      setTestMode(e.target.value)
                    }
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                  />
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
                    onChange={(e) =>
                      setScheduledDate(e.target.value)
                    }
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) =>
                      setDuration(e.target.value)
                    }
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    # of Questions
                  </label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) =>
                      setQuestionCount(e.target.value)
                    }
                    className="mt-1 w-full p-2 border rounded bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) =>
                    setIsPublic(e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="public"
                  className="ml-2 block text-sm"
                >
                  Make this test publicly available
                </label>
              </div>

              {shareLink && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded">
                  <div className="flex items-center">
                    <LinkIcon className="h-5 w-5 text-green-600" />
                    <span className="ml-2 text-sm text-green-800 dark:text-green-200 break-all">
                      {shareLink}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
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
                disabled={step === 0 && !pdfUrl}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Next
                <ChevronRightIcon className="h-5 w-5 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!title || !scheduledDate}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Publish Test
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
