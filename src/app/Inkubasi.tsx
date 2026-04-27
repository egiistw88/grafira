import { useState, useRef, useEffect } from "react";
import { Plus, Image as ImageIcon, Save, X, Check, Loader2, ArrowRight, Wand2, Sparkles } from "lucide-react";
import { useProject } from "../lib/ProjectContext";
import { useNavigate } from "react-router-dom";
import { GoogleGenAI, Type } from "@google/genai";

export default function Inkubasi() {
  const { projectData, updateProjectData } = useProject();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    brand: projectData.brand,
    konsep: projectData.konsep,
    warnaMax: projectData.warnaMax,
  });
  const [images, setImages] = useState<string[]>(projectData.moodboards);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // AI Extraction State
  const [rawClientMessage, setRawClientMessage] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    updateProjectData({ moodboards: images });
  }, [images]);

  const handleSave = () => {
    setIsSaving(true);
    updateProjectData({
      brand: formData.brand,
      konsep: formData.konsep,
      warnaMax: formData.warnaMax,
      moodboards: images,
    });
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 1000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    const newImages = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleExtractBrief = async () => {
    if (!rawClientMessage.trim()) return;
    
    setIsExtracting(true);
    setExtractionError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Saya adalah desainer grafis. Analisis pesan klien (biasanya dari WhatsApp atau Email) berikut dan ekstrak parameter teknis untuk desain sablon kaos. Provide the result in JSON format.\n\nPesan Klien:\n"${rawClientMessage}"`,
        config: {
          systemInstruction: "Kamu adalah asisten desain Al-Manhaj yang membantu menganalisa pesan kasar dari klien menjadi brief teknis yang rapi. Ekstrak nama brand, ringkas konsep menjadi paragraf padat (dengan saran gaya seperti 2D flat vector, scribble art, dll), dan tebak jumlah warna sablon yang optimum jika tidak pasti (1, 2, 3, 4, atau CMYK).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brand: {
                type: Type.STRING,
                description: "Nama brand klien yang diekstrak. Gunakan 'Tidak Diketahui' jika tidak ada.",
              },
              konsep: {
                type: Type.STRING,
                description: "Ringkasan konsep desain yang padat, arah visual, referensi gaya, dan target audiens berbasis instruksi klien. Jika memungkinkan beri sedikit saran gaya populer (misal: 2D flat vector, dll).",
              },
              warnaMax: {
                type: Type.STRING,
                description: "Estimasi jumlah warna sablon. Hanya boleh bernilai: '1', '2', '3', '4', atau 'CMYK'. Jika tidak pasti, berikan '4'.",
              }
            },
            required: ["brand", "konsep", "warnaMax"],
          }
        }
      });
      
      const resultObj = JSON.parse(response.text.trim());
      
      setFormData({
        brand: resultObj.brand || "",
        konsep: resultObj.konsep || "",
        warnaMax: resultObj.warnaMax || "4",
      });
      
      updateProjectData({
        brand: resultObj.brand || "",
        konsep: resultObj.konsep || "",
        warnaMax: resultObj.warnaMax || "4",
      });
      
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Gagal mengekstrak brief.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4 border-b border-neutral-900 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-neutral-200">Inkubasi Ide</h2>
          <p className="text-neutral-500 mt-2 max-w-xl text-sm leading-relaxed">
            Catat brief klien, kumpulkan referensi visual, dan tentukan batasan
            teknikal untuk produksi cetak.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-3 rounded text-sm font-medium transition flex items-center gap-2 ${
              isSaved
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/50"
                : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800"
            } disabled:opacity-75`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan Draft"}
          </button>
          
          <button 
            onClick={() => navigate("/visualisasi")}
            className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3 rounded text-sm font-medium transition flex items-center gap-2"
          >
            Lanjut ke Visualisasi
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
        {/* Left Column: Brief Input */}
        <div className="space-y-10">
          
          {/* AI Extraction Widget */}
          <div className="bg-neutral-900/40 border border-indigo-900/30 rounded-xl p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-indigo-500 transform rotate-12" />
            </div>
            
            <div className="relative z-10 flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Wand2 className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-neutral-200 font-serif text-lg">AI Brief Parser</h3>
            </div>
            
            <p className="text-neutral-400 text-sm max-w-lg relative z-10">
              Tempel pesan kasar klien (contoh dari obrolan WhatsApp). 
              AI Al-Manhaj akan mengekstrak detail teknis, menyiapkan narasi desain, serta menyarankan gaya visual yang solid.
            </p>
            
            <div className="relative z-10 mt-4 space-y-3">
              <textarea
                placeholder="Paste pesan asli klien di sini..."
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-4 text-neutral-300 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none text-sm placeholder:text-neutral-700"
                value={rawClientMessage}
                onChange={(e) => setRawClientMessage(e.target.value)}
              />
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-400">{extractionError}</span>
                <button
                  onClick={handleExtractBrief}
                  disabled={isExtracting || !rawClientMessage.trim()}
                  className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded text-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      Mengekstrak...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Ekstrak Parameter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">
              Nama Brand / Klien
            </label>
            <input
              type="text"
              placeholder="e.g. Urbex Syndicate"
              className="w-full bg-transparent border-b border-neutral-800 text-2xl font-serif py-3 focus:outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-800 text-neutral-200"
              value={formData.brand}
              onChange={(e) => {
                setFormData({ ...formData, brand: e.target.value })
                updateProjectData({ brand: e.target.value })
              }}
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">
              Narasi / Arah Visual
            </label>
            <textarea
              placeholder="Ketik detail konsep, filosofi desain, target audiens..."
              rows={8}
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded-md p-6 text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors resize-none leading-relaxed placeholder:text-neutral-700"
              value={formData.konsep}
              onChange={(e) => {
                setFormData({ ...formData, konsep: e.target.value })
                updateProjectData({ konsep: e.target.value })
              }}
            />
          </div>
        </div>

        {/* Right Column: Spesifikasi & Referensi */}
        <div className="space-y-12">
          <div className="space-y-6">
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-500 border-b border-neutral-900 pb-2 flex">
              Spesifikasi Sablon
            </label>

            <div className="space-y-4">
              <div>
                <span className="block text-sm text-neutral-400 mb-2">
                  Batas Warna Vector (Spot Color)
                </span>
                <select
                  className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 p-3 rounded focus:outline-none focus:border-neutral-600"
                  value={formData.warnaMax}
                  onChange={(e) => {
                    setFormData({ ...formData, warnaMax: e.target.value })
                    updateProjectData({ warnaMax: e.target.value })
                  }}
                >
                  <option value="1">1 Warna (Solid)</option>
                  <option value="2">2 Warna</option>
                  <option value="3">3 Warna</option>
                  <option value="4">4 Warna</option>
                  <option value="CMYK">CMYK (Separasi)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                Moodboard / Referensi
              </label>
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden bg-neutral-900 aspect-square border border-neutral-800">
                      <img src={img} alt={`Moodboard ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-neutral-950/80 text-neutral-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3 transition cursor-pointer ${
                  isDragging
                    ? "border-neutral-500 bg-neutral-900/50"
                    : "border-neutral-800 hover:bg-neutral-900/20"
                }`}
              >
                <ImageIcon className="w-6 h-6 text-neutral-600" />
                <span className="text-sm text-neutral-500">
                  Tarik gambar kemari atau klik untuk unggah
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
