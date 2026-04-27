# Grafira: AI-Powered Apparel Pre-Production System

Selamat datang di repositori **Grafira**, sebuah sistem arsitektur perangkat lunak cerdas yang dirancang khusus untuk memodernisasi dan mengotomatisasi alur kerja pra-produksi desain pakaian (khususnya sablon/screen printing). Dirancang dari perspektif filosofis dan teknis yang modern.

## Sorotan Eksekutif

Grafira mengusung filosofi Zen dengan paduan **Negative Space** ekstrem dan antarmuka single-column yang bebas distraksi. Sistem tidak hanya mengusung konsep minimalis secara visual, tetapi juga ditenagai oleh kecerdasan buatan mutakhir (Google Gemini) untuk membantu proses visualisasi ide, kalkulasi vektor, hingga inspeksi mutu (Quality Control) sebelum cetak nyata.

## Arsitektur Teknologi (Tech Stack)

Sistem ini berdiri di atas fondasi teknologi _production-ready_:

- **Frontend:** React + Vite (Dapat direstriksikan ke dalam Next.js App Router saat deployment Production)
- **Styling:** Tailwind CSS (Mode Gelap Wajib: `bg-neutral-950`, `text-neutral-100`)
- **Backend & State:** Context API & IndexedDB Storage (`idb-keyval`)
- **Vektor Engine:** ImageTracerJS (via Web Worker dengan Post-Processing Lanjutan)
- **AI Engine:** `@google/genai` (Model `gemini-3.1-pro-preview` & Model Image Generation)

## Modul Utama

Aplikasi terbagi dalam alur kerja linier (pipeline) terstruktur yang memaksa pengguna fokus pada satu proses di satu waktu:

### 1. Dashboard (Pusat Kendali)

Dasbor sekilas pandang untuk mengetahui metrik produksi, progres desain, serta navigasi cepat ke berbagai tahap pengerjaan.

### 2. Inkubasi (Penangkap Kilat & Premis)

Tempat di mana gagasan abstrak ditangkap. Desainer dapat mendefinisikan _Brand_, _Konsep_, _Palet Warna_, hingga memuat _Moodboard_. AI akan membantu menyaring kata kunci menjadi _prompt_ desain yang terstruktur.

### 3. Visualisasi (AI-Assisted Drafting)

Modul ini menghubungkan ide (premis) dengan generator gambar AI.

- **Negative Prompts & Guardrails:** Memastikan gambar draf selalu dalam batas sablon (Solid color, 2D flat, no gradient).
- **Referential Generation:** Menggunakan _moodboard_ untuk rujukan gaya komposisi, sementara AI membangun artwork orisinal berdasarkan _Streetwear Pinterest Vibe_.

### 4. Studio Vektor (Kalkulator Kerumitan Vektor)

Bukan sekadar _autotrace_ biasa.

- **Image Complexity Analysis:** AI menganalisis kompleksitas draf gambar, lalu menyetel parameter algoritma SVG secara dinamis agar sesuai (sharp angle, noise reduction).
- **Path Simplification:** Titik koordinat disederhanakan dengan heuristik untuk menghasilkan ukuran file yang efisien namun tetap mempertahankan memori detail.

### 5. Terminal Pra-Cetak (Inspektur Pre-Flight QC)

Celah fatal di lantai produksi (afdruk) dicegah sejak dini.

- **Micro-Tolerance Scanner:** Memindai file kode XML SVG untuk mencari path yang ukurannya terlampau kecil (misal < 1pt) yang bisa membuat kain screen mampet.
- **Layered Export Architecture:** Hasil tracing tidak sekadar digabungkan. Setiap warna secara otomatis ditulis menjadi layer-layer spesifik `<g id="Layer_X_Color_Y">`, sehingga ketika diunduh, desainer industri / pemisah warna (color separator) tidak perlu memblok lapisan sejak awal.

## Deployment ke Vercel

Aplikasi ini disiapkan untuk lingkungan produksi melalui Vercel:

1. **Persiapan Repository:** Dorong _source code_ proyek ini ke repositori Git (GitHub/GitLab).
2. **Koneksi Vercel:** Impor proyek di dashboard Vercel Anda.
3. **Konfigurasi Environment Variable:**
   Tambahkan variabel lingkungan (Environment Variables) wajib pada pengaturan proyek Vercel Anda:
   - `VITE_GEMINI_API_KEY` atau `GEMINI_API_KEY`: Kunci API Google Gemini untuk fungsionalitas AI generatif dan analitik.
4. **Build & Deploy:**
   Simpan dependensi ekosistem dan biarkan Vercel membangun dari direktif `npm run build` dan mendistribusikannya ke edge network mereka.

---

_"Bentuk murni dari fungsionalitas membuahkan estetika yang paling anggun"_
