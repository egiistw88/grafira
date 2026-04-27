import { Layers, Paintbrush, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const activeProjects = [
    {
      id: 1,
      brand: "Urbex Syndicate",
      title: "Retro Screen-Print",
      stage: "Visualisasi",
      date: "Hari ini",
    },
    {
      id: 2,
      brand: "Native Roots",
      title: "Botanical Series",
      stage: "Tracing Vector",
      date: "Kemarin",
    },
    {
      id: 3,
      brand: "Steel Heart",
      title: "Mechanic Love",
      stage: "Pra-Cetak",
      date: "2 Hari lalu",
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4 border-b border-neutral-900 pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif text-neutral-200">
            Selamat Bekerja, Desainer.
          </h2>
          <p className="text-neutral-500 mt-2 max-w-xl text-sm leading-relaxed">
            Pusat kendali kreativitas Anda. Dari konsepsi ide hingga meja sablon,
            semua terstruktur rapi.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Quick Actions */}
        <div className="bg-neutral-900/30 border border-neutral-800 p-8 flex flex-col justify-between group hover:border-neutral-700 transition duration-500">
          <div>
            <div className="h-12 w-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6">
              <Paintbrush className="text-neutral-400 w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif mb-2 text-neutral-200">
              Mulai Projek Baru
            </h3>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
              Tangkap ide kilat dari klien, susun moodboard, dan tetapkan batas
              warna untuk produksi sablon.
            </p>
          </div>
          <Link
            to="/inkubasi"
            className="text-sm uppercase tracking-widest font-medium text-neutral-300 flex items-center gap-2 group-hover:text-white transition"
          >
            Masuk ke Inkubasi{" "}
            <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform duration-300" />
          </Link>
        </div>

        <div className="bg-neutral-900/30 border border-neutral-800 p-8 flex flex-col justify-between group hover:border-neutral-700 transition duration-500">
          <div>
            <div className="h-12 w-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6">
              <Layers className="text-neutral-400 w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif mb-2 text-neutral-200">
              Periksa Antrean Pra-Cetak
            </h3>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
              Validasi pemisahan warna (spot color), sudut halftone, dan
              registration marks sebelum masuk ke percetakan.
            </p>
          </div>
          <Link
            to="/pra-cetak"
            className="text-sm uppercase tracking-widest font-medium text-neutral-300 flex items-center gap-2 group-hover:text-white transition"
          >
            Lihat Antrean{" "}
            <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform duration-300" />
          </Link>
        </div>
      </section>

      {/* Active Work table */}
      <section className="space-y-6">
        <h3 className="text-sm uppercase tracking-widest font-medium text-neutral-500 border-b border-neutral-800 pb-4">
          Projek Berjalan
        </h3>

        <div className="space-y-4">
          {activeProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-6 bg-neutral-900/20 border border-neutral-800 hover:bg-neutral-900/50 transition duration-300 cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                  {project.brand}
                </span>
                <span className="text-lg font-serif text-neutral-200">
                  {project.title}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-sm text-neutral-400 px-3 py-1 bg-neutral-900 rounded-full border border-neutral-800">
                  {project.stage}
                </span>
                <span className="text-xs text-neutral-600 font-mono">
                  {project.date}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-600" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
