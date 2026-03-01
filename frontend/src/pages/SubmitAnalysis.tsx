import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analysisApi } from "../api/client";
import { Send, Loader2, FileCode, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGES = [
  "auto-detect",
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "html",
  "css",
  "sql",
  "bash",
  "yaml",
];

const SAMPLE = `function processUserData(users) {
  var result = [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].active == true) {
      var query = "SELECT * FROM orders WHERE userId = " + users[i].id;
      result.push(eval(query));
    }
  }
  return result;
}`;

export default function SubmitAnalysis() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sourceCode, setSourceCode] = useState("");
  const [language, setLanguage] = useState("auto-detect");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceCode.trim()) { toast.error("Please enter some code"); return; }
    if (!token) return;

    setBusy(true);
    const res = await analysisApi.submit(
      {
        sourceCode,
        language: language === "auto-detect" ? undefined : language,
        fileName: fileName || undefined,
      },
      token
    );
    setBusy(false);

    if (res.success && res.data) {
      toast.success("Analysis submitted! Redirecting...");
      navigate(`/analyses/${res.data.analysisId}`);
    } else {
      toast.error(res.error?.message ?? "Submission failed");
    }
  }

  function loadSample() {
    setSourceCode(SAMPLE);
    setLanguage("javascript");
    setFileName("processUsers.js");
    toast.success("Sample code loaded");
  }

  const lineCount = sourceCode.split("\n").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Analysis</h1>
          <p className="mt-1 text-sm text-gray-400">Paste your code for AI-powered review</p>
        </div>
        <button onClick={loadSample} className="btn-secondary gap-2">
          <Sparkles className="h-4 w-4" />
          Load sample
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fileName" className="mb-1.5 block text-sm font-medium text-gray-300">
              File name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="input-field"
              placeholder="e.g. UserService.ts"
            />
          </div>
          <div>
            <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-gray-300">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l === "auto-detect" ? "Auto-detect" : l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Code editor area */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="code" className="text-sm font-medium text-gray-300">
              Source Code
            </label>
            <span className="text-xs text-gray-500">
              {lineCount} line{lineCount !== 1 ? "s" : ""} · {sourceCode.length.toLocaleString()} chars
            </span>
          </div>
          <div className="relative">
            {/* Line numbers */}
            <div className="pointer-events-none absolute left-0 top-0 flex h-full flex-col overflow-hidden rounded-l-lg border-r border-gray-700 bg-gray-900 px-3 py-2.5 text-right text-xs leading-6 text-gray-600">
              {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              id="code"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="input-field min-h-[400px] resize-y pl-14 font-mono text-sm leading-6"
              placeholder="Paste your code here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FileCode className="h-4 w-4" />
            AI will analyze for security, complexity, edge cases, and more
          </div>
          <button type="submit" disabled={busy || !sourceCode.trim()} className="btn-primary gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "Analyzing..." : "Submit Analysis"}
          </button>
        </div>
      </form>
    </div>
  );
}
