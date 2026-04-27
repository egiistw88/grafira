import { useState, useEffect } from "react";
import { PenTool, UploadCloud, MessageSquare, ZoomIn, ZoomOut, Check, ArrowRight, Wand2, Loader2, RotateCcw } from "lucide-react";
import { useProject } from "../lib/ProjectContext";
import { useNavigate } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import { loadAsset, saveAsset } from "../lib/db";

const STYLE_OPTIONS = ["Streetwear", "Vintage Bootleg", "Y2K Cyber", "Minimalist Line Art", "Traditional Tattoo", "Acid Graphic", "Dark Grunge", "Brutalism"];

export default function Visualisasi() {
  const { projectData } = useProject();
  const navigate = useNavigate();
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["Streetwear", "Vintage Bootleg"]);

  useEffect(() => {
    loadAsset().then(asset => {
      if (asset?.draftImage) {
        setDraftImage(asset.draftImage);
      }
    });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const url = URL.createObjectURL(e.target.files[0]);
      
      // Load into base64 to save to Dexie properly
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setDraftImage(base64);
        saveAsset({ draftImage: base64 });
      };
      reader.readAsDataURL(e.target.files[0]);
      
      setError(null);
    }
  };

  const handleReset = () => {
    setDraftImage(null);
    saveAsset({ draftImage: null });
    setError(null);
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const proceedToStudio = () => {
    navigate("/studio");
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const activeStyles = selectedStyles.length > 0 ? selectedStyles.join(", ") : "Hypebeast, Trendy, Flat Vector";
      const parts: any[] = [];
      const textPrompt = `You are a world-class streetwear graphic designer and merchandise illustrator whose work dominates high-end fashion Pinterest boards. You are creating a MASTERPIECE t-shirt design graphic.

CRITICAL INSTRUCTIONS FOR AESTHETICS & ORIGINALITY:
1. PINTEREST STREETWEAR VIBE: The artwork must look extremely hype, highly curated, and visually striking. Think of top-tier apparel graphics (e.g., vintage bootleg tees, streetwear grails, modern Y2K grunge, avant-garde minimalist line art). The aesthetic must be far beyond generic clipart.
2. NO TEXT / NO TYPOGRAPHY: The brand "${projectData.brand || 'Apparel'}" is context ONLY. DO NOT include any text, letters, or words in the image. Let the graphic speak for itself.
3. THEME/CONCEPT: "${projectData.konsep || 'Abstract graphic'}". Translate this into an iconic, memorable, and bold visual metaphor.
4. IMAGE REFERENCE: If a reference image is provided, use it as a STRONG baseline for the composition, visual style, and layout. You MUST emulate its structural aesthetic, spacing, and energy while adapting it to the new concept.

AESTHETIC & TECHNICAL FORMULA:
- Dominant Style Modifiers: ${activeStyles}. Blend these seamlessly with the visual reference.
- Execution: Elite composition inspired by the reference image. Every shape, line, and contrast must be deliberate. Use strong negative space, high visual impact, and immediately recognizable silhouettes. Emulate the hand-drawn or raw digital feel beloved by modern hype brands.
- Color Limit: STRICTLY limit the palette to a maximum of ${projectData.warnaMax} distinct solid spot colors.
- Production constraints for Sablon (Screen Print): Absolutely NO gradients, NO shading, NO blending, NO transparency, NO anti-aliasing. Use ONLY pure solid flat colors with extremely clean, sharp vector-like edges.
- AI GUARDRAILS (NEGATIVE PROMPTS): no gradients, no 3D render, strict 2D flat, limited color palette, solid shapes, white background, no text, no watermarks, no messy lines, no generic stock-vector look.
- The final artwork must be perfectly centered on a clean white background, resembling an isolated heat-press decal or a clean vector patch, making it perfectly print-ready for tracing.`;

      if (projectData.moodboards.length > 0) {
        // Use the first moodboard as inspiration
        try {
          const response = await fetch(projectData.moodboards[0]);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });
          
          parts.push({
            inlineData: {
              data: base64,
              mimeType: blob.type || 'image/jpeg',
            }
          });
          parts.push({ text: `Analyze the visual composition, art style, framing, and layout from this reference image. Use it as a direct aesthetic and structural foundation for the new design.\n\nThen, execute the following instructions:\n\n${textPrompt}` });
        } catch (e) {
          console.error("Failed to load moodboard", e);
          parts.push({ text: textPrompt });
        }
      } else {
        parts.push({ text: textPrompt });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });

      let generatedImgBase64 = null;
      let generatedImgMime = "image/png";

      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImgBase64 = part.inlineData.data;
            generatedImgMime = part.inlineData.mimeType || "image/png";
            break;
          }
        }
      }

      if (generatedImgBase64) {
        const url = `data:${generatedImgMime};base64,${generatedImgBase64}`;
        setDraftImage(url);
        saveAsset({ draftImage: url });
      } else {
        setError("Gagal menghasilkan gambar dari AI. Coba gunakan deskripsi yang berbeda.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memanggil AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4 border-b border-neutral-900 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-neutral-200">Ruang Visualisasi</h2>
          <p className="text-neutral-500 mt-2 max-w-xl text-sm leading-relaxed">
            Racik seluruh informasi dari Inkubasi Ide menggunakan Tenaga AI untuk menghasilkan desain vector orisinil.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={proceedToStudio}
            className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            disabled={!draftImage || isGenerating}
          >
            Lanjut ke Studio Vector
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
        {/* Sidebar: Brief Context */}
        <aside className="bg-neutral-900/20 border border-neutral-800 rounded-lg p-6 space-y-8">
          <div className="bg-emerald-900/10 border border-emerald-900/30 p-4 rounded-md">
             <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Tenaga AI Aktif
             </h4>
             <p className="text-xs text-neutral-400 leading-relaxed">
               Gunakan tombol di atas kanvas untuk meracik ulang referensi dan konsep di bawah ini menjadi visual yang spesifik untuk sablon manual.
             </p>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4 border-b border-neutral-800 pb-2">Konteks Aktif</h3>
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 block">Brand</span>
              <span className="text-lg font-serif text-neutral-200">{projectData.brand || "Belum ada nama brand"}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block mb-2">Narasi Visual</span>
            <p className="text-sm text-neutral-400 leading-relaxed bg-neutral-900/50 p-4 rounded border border-neutral-800/50">
              {projectData.konsep || "Belum ada narasi konsep."}
            </p>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block mb-2">Batas Warna</span>
            <div className="inline-block px-3 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-sm text-neutral-300">
              {projectData.warnaMax} Warna
            </div>
          </div>

          <div>
            <span className="text-xs text-neutral-500 block mb-2">Modifier Gaya (AI)</span>
            <div className="flex flex-wrap gap-2">
               {STYLE_OPTIONS.map(style => (
                 <button
                   key={style}
                   onClick={() => toggleStyle(style)}
                   className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${selectedStyles.includes(style) ? 'bg-neutral-200 text-neutral-900 border-neutral-200' : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}
                 >
                   {style}
                 </button>
               ))}
            </div>
          </div>

          <div>
             <span className="text-xs text-neutral-500 block mb-3">Referensi Terpilih</span>
             {projectData.moodboards.length > 0 ? (
               <div className="grid grid-cols-2 gap-2">
                 {projectData.moodboards.map((img, idx) => (
                   <div key={idx} className="aspect-square bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                     <img src={img} alt={`Referensi ${idx}`} className="w-full h-full object-cover" />
                   </div>
                 ))}
               </div>
             ) : (
                <div className="text-sm text-neutral-600 italic">Belum ada referensi gambar.</div>
             )}
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="bg-neutral-900/10 border border-neutral-800 rounded-lg overflow-hidden flex flex-col relative min-h-[600px]">
          {/* Canvas Toolbar */}
          <div className="h-14 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
               <button 
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-4 py-1.5 bg-neutral-100 text-neutral-950 hover:bg-white text-xs font-semibold rounded flex items-center gap-2 transition disabled:opacity-75 disabled:cursor-wait"
                >
                 {isGenerating ? (
                   <>
                     <Loader2 className="w-3 h-3 animate-spin" />
                     Meracik Desain AI...
                   </>
                 ) : (
                   <>
                     <Wand2 className="w-3 h-3" />
                     Generate Desain Orisinil dengan AI
                   </>
                 )}
               </button>
            </div>
            {error && (
              <span className="text-xs text-red-400 truncate max-w-xs">{error}</span>
            )}
            <div className="flex items-center gap-2">
               <button className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 rounded transition">
                 <ZoomOut className="w-4 h-4" />
               </button>
               <span className="text-xs font-mono text-neutral-500">100%</span>
               <button className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 rounded transition">
                 <ZoomIn className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
            {!draftImage && !isGenerating ? (
              <label className="flex flex-col items-center justify-center cursor-pointer group">
                <div className="w-20 h-20 rounded-full bg-neutral-900 border-2 border-dashed border-neutral-700 flex items-center justify-center group-hover:border-neutral-500 group-hover:bg-neutral-800 transition">
                  <UploadCloud className="w-8 h-8 text-neutral-500 group-hover:text-neutral-300" />
                </div>
                <span className="mt-4 text-sm font-medium text-neutral-400 group-hover:text-neutral-200">Unggah Sketsa Kasar / Draft (Manual)</span>
                <span className="mt-1 text-xs text-neutral-600 font-mono">Atau gunakan tombol Generate AI di toolbar</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center text-neutral-400 animate-pulse">
                <Wand2 className="w-16 h-16 mb-6 text-neutral-600 animate-bounce" />
                <span className="text-sm font-medium uppercase tracking-widest text-neutral-300">Menyeleraskan Narasi Visual...</span>
                <span className="text-xs font-mono text-neutral-500 mt-2">Menganalisis {projectData.warnaMax} spot colors...</span>
              </div>
            ) : (
              <div className="relative max-w-full max-h-full">
                <img 
                  src={draftImage!} 
                  alt="Draft" 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl border border-neutral-800 rounded bg-neutral-900"
                />
                {/* Floating tool indicator */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center shadow-lg border-2 border-neutral-950">
                  <PenTool className="w-4 h-4 text-neutral-900" />
                </div>
              </div>
            )}
          </div>
          
          {draftImage && !isGenerating && (
             <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <label className="bg-neutral-900/80 backdrop-blur border border-neutral-800 px-4 py-2 rounded-full text-xs text-neutral-400 hover:text-white transition cursor-pointer flex items-center gap-2 shadow-lg">
                   <UploadCloud className="w-3 h-3" />
                   Ganti Gambar Manual
                   <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                <button 
                  onClick={handleReset} 
                  className="bg-red-900/20 backdrop-blur border border-red-900/50 text-red-400 px-4 py-2 rounded-full text-xs hover:bg-red-900/40 hover:text-red-300 transition flex items-center gap-2 shadow-lg"
                >
                   <RotateCcw className="w-3 h-3" />
                   Reset Draft
                </button>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}

