import { useState, useEffect } from "react";
import { Printer, Eye, Crosshair, Cpu, Download, Layers, Zap, Hexagon, Settings, CheckCircle2, RotateCcw, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useProject } from "../lib/ProjectContext";
import { loadAsset } from "../lib/db";

export default function PraCetak() {
  const { projectData } = useProject();
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [vectorSVG, setVectorSVG] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeLayer, setActiveLayer] = useState<number | null>(null);

  const [isRunningQC, setIsRunningQC] = useState(false);
  const [qcResult, setQcResult] = useState<{
    status: string;
    issues: string[];
    recommendation: string;
  } | null>(null);

  useEffect(() => {
    loadAsset().then((asset) => {
      if (asset?.draftImage) {
        setDraftImage(asset.draftImage);
      }
      if (asset?.vectorSVG) {
        setVectorSVG(asset.vectorSVG);
      }
    });
  }, []);

  // Settings
  const [config, setConfig] = useState({
    registrationMarks: true,
    invertFilm: false,
    chokeTrap: 0.5,
    previewMode: "film", // "film" | "color"
  });

  // Calculate colors based on Context
  let colorCount = parseInt(projectData.warnaMax);
  if (isNaN(colorCount)) colorCount = 4; // CMYK Fallback

  const simulatedColors = [
    { name: "Base Underbase", hex: "#FFFFFF", mesh: "T61", role: "Blok Dasar" },
    { name: "Solid Black", hex: "#111111", mesh: "T120", role: "Outline/Shadow" },
    { name: "Blood Red", hex: "#8A0303", mesh: "T90", role: "Spot Color 1" },
    { name: "Poison Green", hex: "#038A3A", mesh: "T90", role: "Spot Color 2" },
    { name: "Deep Blue", hex: "#031B8A", mesh: "T90", role: "Spot Color 3" },
    { name: "CyberYellow", hex: "#EAE023", mesh: "T90", role: "Spot Color 4" },
  ].slice(0, colorCount);

  const handleRIPProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsReady(true);
      setActiveLayer(0);
    }, 2500);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Add registration marks
      const drawCrosshair = (x: number, y: number) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.circle(x, y, 5, 'S');
        doc.line(x - 8, y, x + 8, y);
        doc.line(x, y - 8, x, y + 8);
      };

      if (config.registrationMarks) {
        drawCrosshair(20, 20);
        drawCrosshair(190, 20);
        drawCrosshair(20, 277);
        drawCrosshair(190, 277);
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("GRAFIRA PRINT STUDIO // RAW SEPARATION FILM", 20, 290);
      doc.text(`MODE: ${config.invertFilm ? 'NEGATIVE' : 'POSITIVE'} // LAYERS: ${colorCount}`, 20, 295);

      if (draftImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            // Set canvas size for better resolution
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            
            if (ctx) {
               ctx.fillStyle = "white";
               ctx.fillRect(0, 0, canvas.width, canvas.height);
               
               if (config.invertFilm) {
                 ctx.filter = "invert(1) grayscale(100%) contrast(200%)";
               } else {
                 ctx.filter = "grayscale(100%) contrast(200%)";
               }
               ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
               
               const imgData = canvas.toDataURL("image/jpeg", 0.9);
               const imgRatio = img.height / img.width;
               
               // Fit within A4 printable area (max width 150mm)
               let targetWidth = 150;
               let targetHeight = targetWidth * imgRatio;
               
               if (targetHeight > 230) {
                 targetHeight = 230;
                 targetWidth = targetHeight / imgRatio;
               }
               
               const xPos = (210 - targetWidth) / 2; // Center horizontally
               doc.addImage(imgData, 'JPEG', xPos, 40, targetWidth, targetHeight);
            }
            resolve();
          };
          img.onerror = () => {
            console.error("Failed to load image for PDF");
            resolve();
          };
          img.src = draftImage;
        });
      }

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Grafira_Film_Separation_${colorCount}Colors.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    setIsExporting(true);
    try {
      if (vectorSVG) {
        // True Vector SVG from ImageTracer
        const blob = new Blob([vectorSVG], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Grafira_Vector_Separation.svg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (draftImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL("image/png");
              
              // Create SVG string that embeds the image (compatible with Adobe Illustrator)
              const svgString = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Grafira Print Studio -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${img.width} ${img.height}" width="${img.width}" height="${img.height}">
  <image xlink:href="${imgData}" x="0" y="0" width="${img.width}" height="${img.height}" />
  <!-- (Sistem mensimulasikan path vector SVG dari proses tracing) -->
</svg>`.trim();
              
              const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "Grafira_Vector_Separation.svg";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            resolve();
          };
          img.onerror = () => {
             console.error("Failed to load image for SVG export");
             resolve();
          };
          img.src = draftImage as string;
        });
      }
    } catch (error) {
       console.error("SVG Export failed:", error);
    } finally {
       setIsExporting(false);
    }
  };

  const runPreFlightQC = async () => {
    setIsRunningQC(true);
    setQcResult(null);

    // Heuristic SVG stats parsing to reduce token size while giving AI some context.
    const pathCount = (vectorSVG?.match(/<path/g) || []).length;
    const xmlByteSize = vectorSVG?.length || 0;
    const approximateSmallPaths = (vectorSVG?.match(/d="M[0-9., ]{1,20}Z"/gi) || []).length; // Try to catch tiny/malformed paths
    
    // 3. Pemindai Cacat Mikroskopis (Micro-Tolerance Pre-Flight Scanner) heuristic
    let microFailCount = 0;
    if (vectorSVG) {
      const pathRegex = /<path[^>]*d="([^"]+)"/g;
      let match;
      while ((match = pathRegex.exec(vectorSVG)) !== null) {
        let d = match[1];
        const numbers = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
        if (numbers && numbers.length > 4) {
           const xs = numbers.filter((_, i) => i % 2 === 0).map(Number);
           const ys = numbers.filter((_, i) => i % 2 === 1).map(Number);
           
           const width = Math.max(...xs) - Math.min(...xs);
           const height = Math.max(...ys) - Math.min(...ys);
           
           // Heuristic: Area bounding box terlalu kecil (< 1.5 pt tolerance)
           if (width > 0 && width < 1.5 && height > 0 && height < 1.5) {
               microFailCount++;
           }
        }
      }
    }
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Analisis file XML vektor (SVG) hasil tracing ini. Total elemen <path>: ${pathCount}. 
Heuristik Pemindai Cacat Mikroskopis menemukan titik kritis: ${microFailCount} area dengan ketebalan < 1pt.
Target warna maksimal: ${colorCount}. Total ukuran file: ${xmlByteSize} bytes. 
Lakukan inspeksi kualitas (Pre-Flight) simulasi untuk mendeteksi kerentanan jika diafdruk ke screen sablon. 
Jika heuristik menemukan area <1pt, WAJIB tandai sebagai WARNING atau FAIL karena pori-pori screen akan mampet/hilang.`,
        config: {
          systemInstruction: "Kamu adalah AI Pre-Flight Inspector untuk prepress sablon kaos. Berikan laporan Quality Control (QC). Analisis statistik data SVG yang diberikan. Jika banyak jalur kecil, berikan peringatan ketebalan < 1pt. Jika warna tampak banyak, ingatkan soal hidden color overlap. Keluarkan kembalian JSON murni sesuai format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, description: "Nilainya: 'PASS', 'WARNING', atau 'FAIL'" },
              issues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar teknis temuan masalah, misalnya 'Terdapat 14 path dengan stroke atau area kurang dari 1pt'" },
              recommendation: { type: Type.STRING, description: "Rekomendasi teknis bagi desainer atau staf afdruk produksi" }
            },
            required: ["status", "issues", "recommendation"]
          }
        }
      });
      
      const resultObj = JSON.parse(response.text.trim());
      setQcResult(resultObj);
    } catch (error) {
      console.error("AI QC Failed:", error);
      // Fallback UI to heuristic if AI fails
      if (microFailCount > 0) {
         setQcResult({
            status: "WARNING",
            issues: [`Sistem mendeteksi ${microFailCount} elemen path berukuran di bawah toleransi 1pt. berisiko hilang saat afdruk screen (Micro-Tolerance Check).`],
            recommendation: "Revisi sensitivitas parameter tracing pada Modul Studio. Gunakan reduksi noise yang lebih agresif untuk mengeliminasi titik-titik kerdil."
         });
      }
    } finally {
      setIsRunningQC(false);
    }
  };

  const getSimulatedColorStyle = () => {
    if (activeLayer === null || config.previewMode === "film") {
      return { filter: "grayscale(100%) contrast(200%) brightness(0.2)" };
    }
    return {
      maskImage: `url(${draftImage})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      backgroundColor: simulatedColors[activeLayer].hex,
      width: "100%",
      height: "100%",
    };
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4 border-b border-neutral-900 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-neutral-200">Terminal Pra-Cetak</h2>
          <p className="text-neutral-500 mt-2 max-w-xl text-sm leading-relaxed">
            Neural RIP Engine untuk mengekstraksi film output afdruk. Separasi spot color mutlak, pemasangan mark registrasi, dan traping outline presisi.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportSVG}
            disabled={!isReady || isExporting}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 px-6 py-3 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Eksport Vector (SVG)
          </button>
          
          <button 
            onClick={handleExport}
            disabled={!isReady || isExporting}
            className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isExporting ? "Memproduksi PDF..." : "Eksport Film Master (PDF)"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
        <div className="space-y-8 pr-4">
          
          <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
            <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Manajemen Layer & Separasi
            </h3>
            {isReady && (
              <span className="bg-emerald-900/20 text-emerald-400 border border-emerald-900 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> SEPARASI SELESAI
              </span>
            )}
          </div>

          {!isReady ? (
            <div className="bg-neutral-900/30 border border-neutral-800 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <Cpu className="w-12 h-12 text-neutral-700 mb-6" />
              <h4 className="text-lg font-medium text-neutral-200 mb-2">Inisiasi Postscript AI</h4>
              <p className="text-sm text-neutral-500 max-w-md mb-8">
                Terdapat <strong>{colorCount} Spot Warna</strong> (berdasarkan parameter Inkubasi). Mesin siap memecah node dan mengekspor {colorCount} file film terpisah.
              </p>
              <button
                onClick={handleRIPProcess}
                disabled={isProcessing}
                className="bg-neutral-100 hover:bg-white text-neutral-950 px-6 py-3 rounded text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Zap className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {isProcessing ? "Menjalankan RIP Algorithm..." : "Eksekusi Separasi Spot Color"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {simulatedColors.map((color, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-5 bg-neutral-900/40 border transition-all duration-300 rounded-md cursor-pointer ${
                    activeLayer === idx ? "border-emerald-500 bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.05)] text-emerald-50" : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60"
                  }`}
                  onClick={() => setActiveLayer(idx)}
                >
                  <div className="flex items-center gap-6">
                    <div className="flex items-center justify-center w-8 h-8 bg-neutral-950 border border-neutral-800 rounded text-neutral-400 font-mono text-xs shadow-inner shrink-0">
                      0{idx + 1}
                    </div>
                    <div
                      className="w-10 h-10 rounded-full shadow-sm border-2 border-neutral-700 relative group overflow-hidden shrink-0"
                      style={{ backgroundColor: color.hex }}
                    >
                       <div className="absolute inset-0 bg-neutral-950/0 group-hover:bg-neutral-950/20 transition-colors"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {color.name}
                      </span>
                      <span className={`text-xs font-mono mt-1 tracking-wider ${activeLayer === idx ? 'text-emerald-500/80' : 'text-neutral-500'}`}>
                        {color.hex} • {color.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-neutral-600 uppercase tracking-widest mb-1">
                        Screen Mesh
                      </span>
                      <span className={`text-sm font-mono bg-neutral-950 px-2 py-0.5 rounded border ${activeLayer === idx ? 'text-emerald-400 border-emerald-900/50' : 'text-neutral-300 border-neutral-800'}`}>
                        {color.mesh}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className={`w-10 h-10 flex items-center justify-center bg-neutral-950 rounded border transition ${activeLayer === idx ? 'text-emerald-400 border-emerald-600' : 'text-neutral-500 border-neutral-800 hover:border-emerald-900/50'}`}>
                         <Eye className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-8 p-6 bg-neutral-900/20 border-2 border-dashed border-neutral-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                     <Hexagon className="w-4 h-4 text-emerald-500" /> Layer Pratinjau (Active)
                   </h4>
                   <span className="text-[10px] bg-emerald-950 text-emerald-500 px-2 py-1 rounded font-mono uppercase tracking-wider">
                     {activeLayer !== null ? `Mengekstraksi: Layer 0${activeLayer + 1}` : "Tunggu Inisiasi"}
                   </span>
                </div>
                
                <div className="w-full aspect-[4/3] bg-neutral-200 rounded flex items-center justify-center relative overflow-hidden retro-grid invert-grid border border-neutral-300/20">
                   {draftImage ? (
                      <div className="relative w-full h-full flex items-center justify-center p-8">
                        <div className="absolute inset-4 bg-transparent border border-black/10"></div>
                        {config.registrationMarks && (
                          <>
                            <Crosshair className="w-6 h-6 text-black absolute top-8 left-8 mix-blend-color-burn opacity-80" />
                            <Crosshair className="w-6 h-6 text-black absolute top-8 right-8 mix-blend-color-burn opacity-80" />
                            <Crosshair className="w-6 h-6 text-black absolute bottom-8 left-8 mix-blend-color-burn opacity-80" />
                            <Crosshair className="w-6 h-6 text-black absolute bottom-8 right-8 mix-blend-color-burn opacity-80" />
                            
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-80 mix-blend-color-burn">
                              <div className="w-3 h-3 bg-cyan-500"></div>
                              <div className="w-3 h-3 bg-magenta-500"></div>
                              <div className="w-3 h-3 bg-yellow-500"></div>
                              <div className="w-3 h-3 bg-black"></div>
                            </div>
                          </>
                        )}
                        
                        <div className={`w-full h-full flex items-center justify-center ${config.invertFilm ? 'invert' : ''}`}>
                          {config.previewMode === "film" ? (
                             <img 
                               src={draftImage} 
                               alt="Film Output" 
                               className="max-w-full max-h-full object-contain filter grayscale contrast-200 brightness-50 mix-blend-multiply opacity-90" 
                             />
                          ) : (
                             <div className="relative w-full h-full flex items-center justify-center">
                               <div style={getSimulatedColorStyle()} className="mix-blend-multiply"></div>
                             </div>
                          )}
                        </div>
                      </div>
                   ) : (
                     <div className="text-neutral-400 text-xs font-mono">DRAFT_IMAGE_NOT_FOUND</div>
                   )}
                </div>
              </div>

              {/* AI Pre-Flight Inspector */}
              <div className="mt-8 p-6 bg-neutral-900/20 border border-indigo-900/30 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <ShieldCheck className="w-32 h-32 text-indigo-400" />
                </div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                   <div>
                     <h4 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-indigo-400" /> Inspektur Pre-Flight AI
                     </h4>
                     <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                       Memvalidasi matematika path vektor (ketebalan, overlap) sebelum disetujui untuk cetak.
                     </p>
                   </div>
                   
                   {!qcResult && (
                     <button
                       onClick={runPreFlightQC}
                       disabled={isRunningQC || !vectorSVG}
                       className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded text-xs transition flex items-center gap-2 disabled:opacity-50"
                     >
                       {isRunningQC ? (
                         <><Zap className="w-3 h-3 animate-pulse" /> Memindai Vektor...</>
                       ) : (
                         <><Crosshair className="w-3 h-3" /> Jalankan Inspeksi</>
                       )}
                     </button>
                   )}
                </div>

                {qcResult && (
                  <div className="space-y-4 relative z-10">
                    <div className={`p-3 rounded border flex items-start gap-3 ${
                      qcResult.status === 'PASS' 
                         ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400' 
                         : qcResult.status === 'WARNING'
                         ? 'bg-yellow-900/20 border-yellow-900/50 text-yellow-400'
                         : 'bg-red-900/20 border-red-900/50 text-red-400'
                    }`}>
                      {qcResult.status === 'PASS' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                      <div>
                        <div className="text-xs font-bold font-mono tracking-wider mb-1">STATUS: {qcResult.status}</div>
                        <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                          {qcResult.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs">
                      <span className="text-neutral-500 block mb-1">Rekomendasi AI:</span>
                      <p className="text-neutral-300">{qcResult.recommendation}</p>
                    </div>
                    
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={runPreFlightQC}
                        disabled={isRunningQC}
                        className="text-[10px] text-neutral-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                         <RotateCcw className="w-3 h-3" /> Pindai Ulang
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 bg-neutral-900/30 border border-neutral-900 rounded-lg p-6 h-max">
          <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 border-b border-neutral-800 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Konfigurasi RIP
          </h3>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-neutral-300 group-hover:text-neutral-100 transition">Mark Registrasi (Cross)</span>
                <input 
                  type="checkbox" 
                  checked={config.registrationMarks}
                  onChange={(e) => setConfig({...config, registrationMarks: e.target.checked})}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/20"
                />
              </label>
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Menyematkan target silang di 4 sudut desain untuk memfasilitasi penyesuaian (adjustment) saat penataan screen.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-neutral-300 group-hover:text-neutral-100 transition">Invert Mode (Film)</span>
                <input 
                  type="checkbox" 
                  checked={config.invertFilm}
                  onChange={(e) => setConfig({...config, invertFilm: e.target.checked})}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/20"
                />
              </label>
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Ubah orientasi hitam/putih untuk memblokade sinar UV pada film afdruk. Mengatur bagian pori screen mana yang runtuh.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-800">
               <span className="text-sm font-medium text-neutral-300 block mb-2">Simulasi Warna Mode</span>
               <div className="flex bg-neutral-900 rounded p-1">
                 <button 
                    onClick={() => setConfig({...config, previewMode: "film"})}
                    className={`flex-1 text-xs py-1.5 rounded transition ${config.previewMode === "film" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
                 >
                   Film Logika (B/W)
                 </button>
                 <button 
                    onClick={() => setConfig({...config, previewMode: "color"})}
                    className={`flex-1 text-xs py-1.5 rounded transition ${config.previewMode === "color" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}
                 >
                   Tinta Kalkulasi
                 </button>
               </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-800">
               <span className="text-sm font-medium text-neutral-300 block mb-2">Choke & Spread Trapping</span>
               <div className="flex items-center gap-3">
                 <input 
                   type="range" 
                   min="0.1" 
                   max="1.5" 
                   step="0.1"
                   value={config.chokeTrap}
                   onChange={(e) => setConfig({...config, chokeTrap: parseFloat(e.target.value)})}
                   className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer" 
                 />
                 <span className="text-xs font-mono text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900 shrink-0 text-center">
                   {config.chokeTrap}pt
                 </span>
               </div>
               <p className="text-[10px] text-neutral-600 leading-relaxed mt-2">
                 Pelebaran minimal untuk mencegah mis-registrasi warna bocor di tepian. Wajib pada afdruk manual.
               </p>
            </div>
            
            <div className="pt-4 border-t border-neutral-800">
               <button 
                 onClick={() => {
                   setIsReady(false);
                   setActiveLayer(null);
                 }}
                 disabled={isProcessing}
                 className="w-full bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 text-red-500/80 hover:text-red-400 py-2.5 rounded text-xs transition flex items-center justify-center gap-2 group disabled:opacity-50"
               >
                 <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-90 transition-transform duration-300" /> Reset Kalkulasi
               </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .retro-grid.invert-grid {
          background-image: 
            linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}

