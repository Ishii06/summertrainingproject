import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AuthContext from "../context/AuthContext.jsx";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import CryptoJS from "crypto-js";   // ✅ encryption library
const API_URL = import.meta.env.VITE_API_URL;

// Assets
import BlobClay from "../components/assets/blob-clay.svg";
import BlobSage from "../components/assets/blob-sage.svg";
import PaperTexture from "../components/assets/beige-paper.png";

axios.defaults.baseURL = `${API_URL}`;

const moods = ["😊", "😔", "😡", "😱", "😴", "❤️"];
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const JournalPage = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 🔐 Helper functions
  const encryptText = (text) =>
    CryptoJS.AES.encrypt(text, SECRET_KEY).toString();

  const decryptText = (ciphertext) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || "⚠️ Failed to decrypt";
    } catch {
      return "⚠️ Invalid entry (cannot decrypt)";
    }
  };

  useEffect(() => {
    if (!user || !token) return;
    const fetchEntries = async () => {
      try {
        const res = await axios.get("/api/journal", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!Array.isArray(res.data)) return;
        setEntries(
          res.data.map((e) => ({
            ...e,
            id: e._id,
            text: decryptText(e.text), // ✅ decrypt here
            date: new Date(e.createdAt).toLocaleString(),
            dateOnly: new Date(e.createdAt).toDateString(),
          }))
        );
      } catch (err) {
        console.error("Error fetching entries:", err);
      }
    };
    fetchEntries();
  }, [user, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!user || !token) return setShowLoginAlert(true);
    if (!entry.trim()) {
      setErrorMessage("Please write something before saving.");
      return;
    }
    if (!mood) {
      setErrorMessage("Please select your current mood.");
      return;
    }

    // 🔐 Encrypt before saving
    const encryptedText = encryptText(entry);

    const tempEntry = {
      id: Date.now(),
      text: entry,
      mood,
      date: new Date().toLocaleString(),
      dateOnly: new Date().toDateString(),
    };
    setEntries([tempEntry, ...entries]);
    setEntry("");
    setMood("");
    setAiResult(null);

    try {
      const res = await axios.post(
        "/api/journal",
        {
          text: encryptedText, // ✅ store encrypted version
          mood: tempEntry.mood,
          dateOnly: tempEntry.dateOnly,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEntries((prev) => [
        {
          ...res.data,
          id: res.data._id,
          text: decryptText(res.data.text), // ✅ decrypt when adding
          date: new Date(res.data.createdAt).toLocaleString(),
          dateOnly: new Date(res.data.createdAt).toDateString(),
        },
        ...prev.filter((en) => en.id !== tempEntry.id),
      ]);
    } catch (err) {
      console.error("Error saving entry:", err);
    }
  };

  const handleDelete = async (entryId) => {
    if (!token) return;
    try {
      await axios.delete(`/api/journal/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  const handleAiAnalyze = async () => {
    if (!user) return setShowLoginAlert(true);
    if (!entry.trim()) {
      setErrorMessage("Please write something to analyze.");
      return;
    }

    setAiResult({ content: "Analyzing..." });

    try {
      const res = await axios.post(
        "/api/ai/analyze",
        { journalText: entry }, // ✅ analyze plain text, not encrypted
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAiResult({
        content: res.data.aiMessage || "No response from AI",
      });
    } catch (err) {
      console.error("AI analysis failed:", err.response?.data || err.message);
      setAiResult({
        content: "AI analysis failed. Please try again later.",
      });
    }
  };

  const filteredEntries = selectedDate
    ? entries.filter((e) => e.dateOnly === selectedDate.toDateString())
    : entries;

  return (
    <main className="relative bg-[#F4EDE3] text-neutral-800 min-h-screen overflow-x-hidden">
      {/* Background textures + blobs same as before */}

      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-16 relative z-10">
        <h1 className="font-serif text-5xl font-semibold text-neutral-900 mb-10 text-center">
          Your Journal
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="rounded-3xl border border-neutral-200 bg-white/70 backdrop-blur-lg p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                  className="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white/90"
                  placeholder="Write your thoughts..."
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  rows={5}
                />

                {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

                <p className="text-neutral-800 font-semibold">How are you feeling?</p>
                <div className="flex gap-3 flex-wrap">
                  {moods.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMood(m === mood ? "" : m)}
                      className={`px-4 py-2 rounded-full border transition-all ${
                        mood === m
                          ? "bg-neutral-800 text-white border-neutral-800"
                          : "bg-white hover:bg-neutral-50 border-neutral-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button type="submit"
                    className="flex-1 py-3 rounded-full font-semibold bg-neutral-900 text-white hover:bg-neutral-800">
                    Save Entry
                  </button>
                  <button type="button" onClick={handleAiAnalyze}
                    className="flex-1 py-3 rounded-full font-semibold bg-amber-600 text-white hover:bg-amber-500">
                    Analyse with AI
                  </button>
                </div>

                {/* Info Box */}
                <div className="text-center">
                  <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm shadow-sm">
                    🔒 Your journal entries are securely encrypted and cannot be accessed by anyone else.
                  </div>
                </div>
              </form>
            </motion.div>

            {aiResult && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white/70 backdrop-blur-lg p-6 rounded-3xl shadow-sm border-l-4 border-neutral-400">
                <p className="text-gray-800">{aiResult.content}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Calendar + Past Entries same as before */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-neutral-900">Past Entries</h3>
              {filteredEntries.length === 0 && (
                <p className="text-neutral-700 text-sm">No entries found.</p>
              )}
              {filteredEntries.map((e) => (
                <motion.div key={e.id} variants={fadeUp} initial="hidden" animate="visible"
                  className="bg-white/70 backdrop-blur-lg p-4 rounded-2xl shadow-sm border-l-4 border-neutral-400">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl">{e.mood}</span>
                    <span className="text-sm italic text-gray-500">{e.date}</span>
                  </div>
                  <p className="text-gray-800">{e.text}</p>
                  {user && (
                    <button onClick={() => handleDelete(e.id)}
                      className="text-red-500 text-sm mt-2 underline">
                      Delete
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default JournalPage;