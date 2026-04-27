import { useState, useRef, useEffect } from "react";
import { FilePenLine, CheckCircle2, Circle, Wand2, Layers, UploadCloud, ArrowRight, MonitorPlay, Zap } from "lucide-react";
import { useProject } from "../lib/ProjectContext";
import { useNavigate } from "react-router-dom";
import { loadAsset, saveAsset } from "../lib/db";

export default function Studio() {
  const { projectData } = useProject();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vectorFile, setVectorFile] = useState<{ name: string; url: string } | null>(null);
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [isTraced, setIsTraced] = useState(false);

  useEffect(() => {
    loadAsset().then((asset) => {
      if (asset?.draftImage) {
        setDraftImage(asset.draftImage);
      }
      if (asset?.vectorSVG) {
        const blob = new Blob([asset.vectorSVG], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        setVectorFile({ name: "AlManhaj_Vector_Layered.svg", url });
        setIsTraced(true);
      }
    });
  }, []);

  const [checkLists, setCheckLists] = useState([
    { id: 1, text: "Ubah semua stroke menjadi outline (Expand paths)", done: false },
    { id: 2, text: "Hapus path tak terlihat & raster sisa (Deep CleanUp)", done: false },
    { id: 3, text: "Separasi berdasarkan batas warna (Spot Color Extract)", done: false },
    { id: 4, text: "Validasi ketebalan minim garis (1pt Threshold)", done: false },
  ]);

  const allChecked = checkLists.every(item => item.done);

  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);
  const [complexityAnalysis, setComplexityAnalysis] = useState<null | {
    complexityLevel: string;
    params: {
      blurradius: number;
      pathomit: number;
      colorquantcycles: number;
    };
  }>(null);

  const analyzeComplexity = async () => {
    if (!draftImage) return;
    setIsAnalyzingComplexity(true);
    setComplexityAnalysis(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = draftImage.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: draftImage.split(';')[0].split(':')[1],
                }
              },
              { text: "Lakukan analisis kerumitan gambar (Image Complexity Analysis) untuk proses auto-tracing SVG. Sesuaikan parameter imagetracerjs agar paling optimal untuk dicetak sablon." }
            ]
          }
        ],
        config: {
          systemInstruction: "Kamu adalah asisten ahli pemrosesan vektor untuk sablon kaos. Analisis rasio antara batas tajam dan kehalusan gradasi. Jika desain berupa teks simpel/logo blok, set blurradius=0, pathomit=8, colorquantcycles=1. Jika ilustrasi rumit berisi detail kecil-kecil, set blurradius=1, pathomit=4, colorquantcycles=3 untuk melestarikan memori detail tanpa terlalu membebani titik path. Kembalikan data dalam JSON murni.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              complexityLevel: {
                type: Type.STRING,
                description: "Tingkat kerumitan desain, misalnya: 'Rendah (Teks/Bentuk Dasar)', 'Sedang (Ilustrasi)', atau 'Tinggi (Kompleks/Rendet)'.",
              },
              params: {
                 type: Type.OBJECT,
                 properties: {
                   blurradius: { type: Type.INTEGER, description: "Disarankan 0 untuk garis tajam, 1 atau 2 untuk desain agak fuzzy." },
                   pathomit: { type: Type.INTEGER, description: "Disarankan 8 untuk desain simpel, 4 atau 2 untuk desain rumit." },
                   colorquantcycles: { type: Type.INTEGER, description: "Siklus kuantisasi, 1 untuk simpel, 3 untuk rumit." }
                 },
                 required: ["blurradius", "pathomit", "colorquantcycles"]
              }
            },
            required: ["complexityLevel", "params"],
          }
        }
      });
      
      const resultObj = JSON.parse(response.text.trim());
      setComplexityAnalysis(resultObj);
    } catch (err: any) {
      console.error("Gagal menganalisis gambar:", err);
    } finally {
      setIsAnalyzingComplexity(false);
    }
  };

  const handleTraceDraft = () => {
    if (!draftImage) return;
    setIsTracing(true);

    const options = {
      corsenabled: true,
      ltres: 1,
      qtres: 1,
      pathomit: complexityAnalysis?.params?.pathomit ?? 8,
      rightangleenhance: true,
      colorsampling: 2,
      numberofcolors: parseInt(projectData.warnaMax) || 4,
      mincolorratio: 0,
      colorquantcycles: complexityAnalysis?.params?.colorquantcycles ?? 3,
      blurradius: complexityAnalysis?.params?.blurradius ?? 0,
      blurdelta: 20
    };

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsTracing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      
      const worker = new Worker(new URL('../workers/vectorWorker.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ imgd: imgData, options });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'success') {
          const svgStr = e.data.svgStr;
          setIsTracing(false);
          setIsTraced(true);
          saveAsset({ vectorSVG: svgStr });
          const blob = new Blob([svgStr], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          setVectorFile({ name: "AlManhaj_Vector_Layered.svg", url });
          setCheckLists(prev => prev.map(item => [1,2,3].includes(item.id) ? { ...item, done: true } : item));
        } else {
          console.error(e.data.error);
          setIsTracing(false);
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err.message);
        setIsTracing(false);
        worker.terminate();
      }
    };
    img.src = draftImage;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setVectorFile({ name: file.name, url });
      setIsTraced(false);
    }
  };

  const toggleCheck = (id: number) => {
    setCheckLists(prev => 
      prev.map(item => item.id === id ? { ...item, done: !item.done } : item)
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4 border-b border-neutral-900 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-neutral-200">Studio Jaringan Saraf</h2>
          <p className="text-neutral-500 mt-2 max-w-xl text-sm leading-relaxed">
            Laboratorium pemrosesan vector. Menggunakan algoritma Image-to-SVG mutakhir untuk mengekstraksi path, memisahkan lapisan warna (separasi), dan memastikan geometri aman untuk film afdruk.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/pra-cetak")}
            disabled={!vectorFile || !allChecked}
            className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            Lanjut ke Pra-Cetak
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8 pr-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 border-b border-neutral-900 pb-2 flex items-center gap-2">
            <MonitorPlay className="w-4 h-4" /> Ruang Komputasi
          </h3>

          {!vectorFile ? (
            <div className="space-y-8">
              {draftImage ? (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg overflow-hidden">
                  <div className="p-4 bg-emerald-900/10 border-b border-neutral-800 flex items-center justify-between">
                     <span className="text-xs font-medium text-emerald-400 flex items-center gap-2">
                       <Zap className="w-4 h-4" /> Deteksi AI Raster Siap
                     </span>
                     <span className="text-xs font-mono text-neutral-500">Max {projectData.warnaMax} Segmen</span>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded border border-neutral-700 overflow-hidden relative group shrink-0">
                        <img 
                          src={draftImage} 
                          alt="Draft Konsep" 
                          className="w-full h-full object-cover filter contrast-125 grayscale" 
                        />
                        <div className="absolute inset-0 bg-emerald-500/20 mix-blend-overlay"></div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-neutral-200">Raster dari Ruang Visualisasi</h4>
                          <p className="text-xs text-neutral-500 mt-1 leading-relaxed truncate whitespace-normal break-words line-clamp-3">
                            Sistem siap memecah pixel menjadi node (path) matematika dan mengelompokkan grid warna.
                          </p>
                        </div>
                        
                        <div className="space-y-3 p-3 bg-neutral-950/50 rounded border border-neutral-800">
                          <label className="text-[10px] text-neutral-500 font-mono tracking-wider flex justify-between items-center">
                            <span>PARAMETER OPTIMASI</span>
                            {!complexityAnalysis && !isAnalyzingComplexity && (
                              <button 
                                onClick={analyzeComplexity}
                                className="text-emerald-500/70 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                              >
                                <Wand2 className="w-3 h-3" /> ANALISIS AI
                              </button>
                            )}
                            {isAnalyzingComplexity && (
                              <span className="text-emerald-500/70 animate-pulse flex items-center gap-1">
                                <Wand2 className="w-3 h-3" /> MENGANALISIS...
                              </span>
                            )}
                            {complexityAnalysis && (
                              <span className="text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> AI ASSISTED
                              </span>
                            )}
                          </label>
                          
                          {complexityAnalysis && (
                            <div className="text-[10px] bg-emerald-900/10 text-emerald-500/80 p-2 rounded mb-2 border border-emerald-900/30">
                              Level Kerumitan: {complexityAnalysis.complexityLevel}
                            </div>
                          )}

                          <div className="space-y-2.5 text-xs text-neutral-300">
                            <div className="flex justify-between items-center gap-2">
                               <span className="truncate">Toleransi Sudut (Path Omit)</span>
                               <span className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 font-mono text-neutral-400 w-32 text-center">
                                  {complexityAnalysis?.params?.pathomit ?? 8}
                               </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                               <span className="truncate">Blur Radius</span>
                               <span className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 font-mono text-neutral-400 w-32 text-center">
                                  {complexityAnalysis?.params?.blurradius ?? 0}
                               </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                               <span className="truncate">Kuantisasi Siklus</span>
                               <span className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 font-mono text-neutral-400 w-32 text-center">
                                  {complexityAnalysis?.params?.colorquantcycles ?? 3}
                               </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handleTraceDraft}
                          disabled={isTracing}
                          className="bg-neutral-100 hover:bg-white text-neutral-950 px-4 py-3 rounded text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 w-full justify-center group"
                        >
                          {isTracing ? (
                            <Wand2 className="w-4 h-4 animate-spin text-neutral-950" />
                          ) : (
                            <Wand2 className="w-4 h-4 text-neutral-600 group-hover:text-neutral-950 transition-colors" />
                          )}
                          {isTracing ? "Kalkulasi Neural Tracing..." : "Eksekusi Auto-Trace Vector"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/20 border border-neutral-800 border-dashed rounded-lg p-8 text-center">
                    <Wand2 className="w-8 h-8 text-neutral-700 mx-auto mb-4" />
                    <span className="block text-sm text-neutral-300 font-medium">Data Raster Kosong</span>
                    <span className="block text-xs text-neutral-600 mt-2">Tidak ada referensi AI dari Ruang Visualisasi untuk di-trace.</span>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs font-mono text-neutral-600 before:h-px before:flex-1 before:bg-neutral-900 after:h-px after:flex-1 after:bg-neutral-900 uppercase">
                BYPASS MANUAL
              </div>

              <div 
                className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-900/50 transition cursor-pointer flex items-center justify-between group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center border border-neutral-700 group-hover:border-neutral-500 transition">
                    <UploadCloud className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <span className="block text-neutral-200 text-sm font-medium">
                      Unggah File Vector Final
                    </span>
                    <span className="block text-neutral-500 text-xs mt-1">
                      Mendukung format .ai, .eps, .pdf, .svg murni
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition transform group-hover:translate-x-1" />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".ai,.eps,.pdf,.svg" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 bg-neutral-900/20 border border-neutral-800 rounded-lg overflow-hidden flex flex-col relative h-[450px]">
              <div className="p-4 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center border border-neutral-700">
                     <Layers className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-200 truncate max-w-[200px]">{vectorFile.name}</div>
                    <div className="text-xs text-emerald-500/80 mt-0.5 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Geometri Dimuat
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setVectorFile(null);
                    setIsTraced(false);
                    setCheckLists(prev => prev.map(item => ({...item, done: false})));
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }} 
                  className="text-xs font-medium text-neutral-400 hover:text-white px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition"
                >
                  Clear Buffer
                </button>
              </div>

              <div className="flex-1 bg-neutral-950 flex items-center justify-center p-8 relative overflow-hidden retro-grid">
                {vectorFile.url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {vectorFile.url.match(/\.(svg)$/i) || vectorFile.url.startsWith("blob:") ? (
                       <img src={vectorFile.url} alt="Vector Preview" className="max-w-full max-h-full object-contain filter saturate-150 drop-shadow-2xl z-10 relative" />
                    ) : (
                       <img src={vectorFile.url} alt="Traced Preview" className="max-w-full max-h-full object-contain filter saturate-150 drop-shadow-2xl z-10 relative" />
                    )}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                ) : (
                    <div className="w-3/4 h-3/4 border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center relative bg-neutral-900/30">
                       <FilePenLine className="w-12 h-12 text-neutral-600 mb-4" />
                       <span className="text-neutral-500 font-mono text-sm">Pratinjau Path Mode</span>
                       <span className="text-neutral-600 text-xs mt-2 uppercase tracking-widest">Menunggu Data...</span>
                    </div>
                )}
                
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  {vectorFile && (
                    <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 text-[10px] px-2 py-1 font-mono text-neutral-500 rounded-sm">
                      {isTraced ? "ALGORITMA TRACING : AKTIF" : "MANUAL BYPASS : AKTIF (PREVIEW)"}
                    </div>
                  )}
                  {isTracing ? (
                    <div className="text-[10px] font-mono text-emerald-500/50 animate-pulse">
                      PROCESSING VECTORS...
                    </div>
                  ) : isTraced ? (
                    <div className="text-[10px] font-mono text-emerald-500/50">
                      VECTOR: ISOLATED & RENDERED
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 border-b border-neutral-900 pb-2">
            Protokol Keamanan Afdruk
          </h3>

          <div className="space-y-3">
            {checkLists.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`flex items-start gap-4 p-4 border rounded-md transition cursor-pointer ${
                  item.done 
                    ? "bg-neutral-900/10 border-neutral-800/50" 
                    : "bg-neutral-900/40 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900/60"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-600"></div>
                  )}
                </div>
                <span
                  className={`text-sm leading-relaxed ${item.done ? "text-neutral-500 line-through" : "text-neutral-200"}`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-lg flex items-start gap-3">
             <div className="mt-1">
               <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
             </div>
             <p className="text-xs text-yellow-600/80 leading-relaxed font-medium">
               Validasi secara manual sangat diwajibkan. Kegagalan membedah path atau ketebalan outline yang tidak memadai (under 1pt) akan menyebabkan mampet pada pori-pori screen cetak.
             </p>
          </div>
        </div>
      </div>

      <style>{`
        .retro-grid {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}

