// ─── Indonesian translations for Kurio Studio ────────────────────────────────

import type { TranslationKeys } from "./en";

const id: TranslationKeys = {
  // ── Global / Shared ──────────────────────────────────────────────────────
  beta: "Beta",
  publicBeta: "Beta Publik",
  startConverting: "Mulai konversi",
  feedback: "Masukan",
  comingSoon: "Segera hadir",
  openTool: "Buka tool",
  install: "Instal",
  reload: "Muat ulang",
  close: "Tutup",

  // ── Navbar ───────────────────────────────────────────────────────────────
  navTools: "Tool",
  navWorkspace: "Riwayat",
  navAIHelper: "AI Helper",
  navCloseMenu: "Tutup menu navigasi",
  navOpenMenu: "Buka menu navigasi",

  // ── PWA Install Toast ────────────────────────────────────────────────────
  pwaInstallTitle: "Instal Kurio Studio?",
  pwaInstallDesc: "Tambahkan ke layar utama untuk akses offline.",
  pwaInstallBtn: "Instal",

  // ── Beta Banner ──────────────────────────────────────────────────────────
  betaBannerText: "Kurio Studio sedang dalam tahap beta publik. Sebagian besar tool memproses file langsung di browsermu, dan fitur AI dibatasi penggunaannya.",
  betaBannerHide: "Sembunyikan pesan beta",

  // ── Hero Section ─────────────────────────────────────────────────────────
  heroHeadline: "Studio ringan untuk kebutuhan file kreatifmu sehari-hari.",
  heroSubtitle: "Konversi, kompres, resize, format, dan preview aset kreatif tanpa perlu berpindah antar tool atau memperlambat pekerjaanmu.",
  heroCTAPrimary: "Mulai konversi",
  heroCTASecondary: "Coba AI Helper",
  heroTrustLine: "Beta publik\u00A0•\u00A0Pemrosesan file di browser\u00A0•\u00A0Akses AI Helper terbatas",

  // ── Quick Drop Zone ──────────────────────────────────────────────────────
  quickDropTitle: "Deteksi File Cepat",
  quickDropSubtitle: "Seret atau pilih file — Kurio mendeteksi format dan menyarankan tool yang cocok secara otomatis.",
  quickDropDrag: "Letakkan file kamu di sini",
  quickDropDragSub: "Kurio akan mendeteksi tipe file dan merekomendasikan tool yang tepat.",
  quickDropBrowse: "Pilih File",
  quickDropAnalyzing: "Menganalisis file...",
  quickDropAnalyzingDesc: "Kurio sedang memeriksa file kamu dan mencocokkannya dengan tool lokal yang paling relevan.",
  quickDropRecognized: "Dikenali",
  quickDropRecommendedActions: "Rekomendasi Aksi",
  quickDropPickWorkflow: "Pilih alur kerja yang tepat untuk file ini.",
  quickDropBrowseDir: "Jelajahi semua tool",
  quickDropAnalyzeAnother: "Analisis file lain",
  quickDropTryAnother: "Coba file lain",
  quickDropErrorSize: "File terlalu besar",
  quickDropErrorSizeDesc: "Item yang diunggah melebihi batas ukuran file maksimal saat ini (50 MB). Harap pilih file yang lebih kecil.",
  quickDropTryAgain: "Coba lagi",

  // ── Tools Directory ──────────────────────────────────────────────────────
  toolsDirTitle: "Pusat Tool Kreator",
  toolsDirSubtitle: "Cari berdasarkan tugas, format, atau alur kerja dan buka tool yang tepat dalam hitungan detik.",
  toolsDirAll: "Semua Tool",
  toolsDirSearch: "Cari berdasarkan tugas atau format...",
  toolsDirEmpty: "Tidak ada tool yang cocok",
  toolsDirEmptyHint: "Coba format, kategori, atau nama tugas lain.",
  toolCardComingSoonDesc: "Tool ini dinonaktifkan selama beta publik sementara kami menyelesaikan pengujian.",
  toolCardInputs: "Input",
  toolCardOutputs: "Output",

  // ── Tool Page Shell ──────────────────────────────────────────────────────
  toolShellBack: "Kembali ke semua tool",
  toolShellNotFound: "Spesifikasi tool tidak ditemukan",
  toolShellAllTools: "Direktori semua tool",
  toolShellAccepted: "Format diterima",
  toolShellExport: "Format ekspor",
  toolShellFeedback: "Kirim masukan beta",
  toolShellBetaNote: "Tool ini sedang diuji dengan file dan browser sungguhan. Laporkan file rusak, konversi gagal, atau output yang membingungkan.",
  toolShellBetaNoteLabel: "Catatan beta publik:",
  toolShellRelated: "Tool terkait",

  // ── Upload Drop Zone ─────────────────────────────────────────────────────
  uploadChooseFile: "Pilih file",
  uploadErrorIncompatible: "Aset tidak didukung",
  uploadErrorUnsupported: "Format file tidak didukung",
  uploadErrorFormatDesc: "Format file tidak valid. Tipe yang didukung:",
  uploadErrorFormatSuggest: "Ekspor atau konversi file sumber ke salah satu format yang didukung, lalu unggah kembali.",
  uploadErrorLarge: "File terlalu besar",
  uploadErrorSizeDesc: "File melebihi batas ukuran maksimal.",
  uploadErrorSizeSuggest: "Gunakan file yang lebih kecil, pisahkan dokumen, atau kurangi dimensi gambar sebelum mengunggah.",

  // ── Output Panel ─────────────────────────────────────────────────────────
  outputTitle: "Antrian Ekspor",
  outputBefore: "Sebelum",
  outputAfter: "Sesudah",
  outputSavings: "Penghematan",
  outputShrink: "lebih kecil",
  outputReducedBy: "Berkurang",
  outputAssembling: "Menyiapkan ekspor...",

  // ── Workspace Page ───────────────────────────────────────────────────────
  workspaceTitle: "Riwayat Workspace",
  workspaceSubtitle: "Lacak, tinjau, dan buka kembali operasi file terbaru yang diproses di Kurio Studio.",
  workspaceExport: "Ekspor JSON",
  workspaceClearAll: "Hapus Riwayat",
  workspaceClearConfirm: "Hapus semua riwayat lokal? Ini hanya menghapus riwayat yang tersimpan di browser ini.",
  workspaceYesWipe: "Hapus riwayat",
  workspaceCancel: "Batal",
  workspaceSearch: "Cari file, tool, atau output...",
  workspaceAll: "Semua",
  workspaceCompleted: "Selesai",
  workspaceProcessing: "Diproses",
  workspaceFailed: "Gagal",
  workspaceReady: "Siap",
  workspaceError: "Error",
  workspaceEmpty: "Riwayat workspace kosong",
  workspaceEmptyHint: "Proses file dengan tool apa saja atau jatuhkan file di beranda untuk memulai riwayat lokal.",
  workspaceNoMatch: "Tidak ada riwayat yang cocok",
  workspaceNoMatchHint: "Coba kata kunci atau filter status lain.",
  workspaceOpenTool: "Buka kembali",
  workspaceSize: "Ukuran",
  workspaceDate: "Tanggal",
  workspaceRecords: "Rekaman",
  workspacePinned: "Disematkan",
  workspaceLocalTitle: "Riwayat browser lokal",
  workspaceLocalDesc: "Daftar ini disimpan di localStorage untuk akses cepat. Menghapusnya tidak akan menghapus file dari perangkatmu.",
  workspaceShowAllTools: "Tampilkan semua tool",

  // ── Workspace Toasts ─────────────────────────────────────────────────────
  toastItemRemoved: "Item dihapus dari workspace",
  toastPinned: "Disematkan ke workspace",
  toastUnpinned: "Lepas sematan dari workspace",
  toastHistoryCleared: "Riwayat workspace dihapus",

  // ── Command Menu ─────────────────────────────────────────────────────────
  cmdPlaceholder: "Cari tool, workspace, atau fitur...",
  cmdEmpty: "Tidak ditemukan tool atau fitur.",
  cmdNavigation: "Navigasi",
  cmdHome: "Beranda",
  cmdWorkspace: "Riwayat Workspace",
  cmdAIHelper: "AI Helper",
  cmdLocalTools: "Tool Lokal",
  cmdSupport: "Dukungan",
  cmdFeedback: "Kirim Masukan Beta",

  // ── Error Boundary ───────────────────────────────────────────────────────
  errorTitle: "Ups, terjadi kesalahan",
  errorDesc: "Terjadi error tak terduga saat memuat tool ini. Operasi berat bisa gagal jika file terlalu besar atau rusak.",
  errorReload: "Muat Ulang",
  errorHome: "Kembali ke Beranda",

  // ── Footer ───────────────────────────────────────────────────────────────
  footerDesc: "Buat, konversi, dan siapkan aset lebih cepat. Kurio Studio menyediakan tool berbasis browser berkinerja tinggi dan alur kerja berbantuan AI dalam satu workspace. Dibuat untuk kreator, desainer, dan developer.",
  footerWorkspace: "Workspace",
  footerAssetConverters: "Konverter Aset",
  footerMyHistory: "Riwayat Saya",
  footerCreativeAssistant: "Asisten Kreatif",
  footerPrivacyBeta: "Privasi & Info Beta",
  footerContact: "Kontak",
  footerTrustPrivacy: "Kepercayaan & Privasi",
  footerTrustDesc: "Sebagian besar tool berjalan langsung di browser. Akses AI Helper dibatasi selama beta publik.",
  footerPrivacyPolicy: "Kebijakan Privasi",
  footerTerms: "Ketentuan Layanan",
  footerCopyright: "Kurio Studio. Hak cipta dilindungi.",

  // ── Settings Page ────────────────────────────────────────────────────────
  settingsTitle: "Privasi & Info Beta",
  settingsSubtitle: "Kurio Studio saat ini dalam tahap beta publik. Halaman ini menjelaskan cara kerja pemrosesan file, permintaan AI helper, dan batasan beta.",
  settingsLocalTitle: "Tool file lokal",
  settingsLocalP1: "Sebagian besar tool Kurio Studio berjalan langsung di browsermu. Termasuk tool inti seperti konversi PDF, kompresi gambar, resize, formatting JSON, dan preview Lottie.",
  settingsLocalP2: "Untuk tool lokal, file yang diunggah diproses di tab browser dan tidak disimpan di server Kurio Studio.",
  settingsUploadTitle: "Batas unggahan",
  settingsUploadP1: "Selama beta, satu file yang diunggah bisa berukuran hingga",
  settingsUploadLimit: "50 MB",
  settingsUploadP2: "File besar masih bergantung pada memori browser dan performa perangkat, terutama PDF dengan banyak halaman atau gambar beresolusi tinggi.",
  settingsAITitle: "Penggunaan AI Helper",
  settingsAIP1: "AI Helper menggunakan proxy backend untuk menghubungi Gemini. Browser tidak menerima API key Gemini.",
  settingsAIP2: "Permintaan AI mengirim teks prompt dan metadata teks terkait yang dibutuhkan untuk respons asisten. File lokal tidak dikirim ke Gemini oleh alur tool inti saat ini.",
  settingsRateTitle: "Batas penggunaan beta",
  settingsRateP1: "Penggunaan AI dibatasi selama beta agar pengujian publik tetap stabil dan adil untuk semua orang.",
  settingsRateP2: "Jika permintaan AI diblokir sementara, tunggu kuota direset dan lanjutkan menggunakan tool file lokal.",
  settingsReportTitle: "Apa yang perlu dilaporkan selama beta",
  settingsReportDesc: "Laporkan file rusak, output membingungkan, konversi gagal, masalah spesifik browser, atau respons AI helper yang tidak sesuai dengan tool yang dipilih.",

  // ── Home Page: Category Grid ─────────────────────────────────────────────
  catGridTitle: "Kategori Rekayasa",
  catGridSubtitle: "Jelajahi rangkaian modul workspace kami yang dirancang untuk menangani tugas aset repetitif kamu.",
  catGridModule: "modul tersedia",
  catGridModules: "modul tersedia",
  catGridView: "Lihat modul",

  // ── Home Page: How It Works ──────────────────────────────────────────────
  hiwTitle: "Alur pemrosesan sederhana",
  hiwSubtitle: "Unggah aset kamu, pilih pengaturan yang kamu butuhkan, dan ekspor hasil yang rapi dengan aman dalam satu workspace.",
  hiwStep1Title: "Letakkan atau pilih aset",
  hiwStep1Desc: "Pilih gambar, PDF, atau animasi JSON vektor. Header file akan dianalisis secara real-time.",
  hiwStep2Title: "Atur konfigurasi",
  hiwStep2Desc: "Atur faktor skala kompresor, koefisien kualitas, atau jalankan pemformat kode secara lokal.",
  hiwStep3Title: "Ekspor gabungan",
  hiwStep3Desc: "Verifikasi input dalam penampung pratinjau split, dan unduh aset individu atau dalam satu arsip ZIP.",

  // ── Home Page: Featured Tools ────────────────────────────────────────────
  featToolsTitle: "Alat utilitas kreator unggulan",
  featToolsSubtitle: "Tool yang berfungsi penuh dan dioptimalkan klien siap dijalankan dalam workspace kamu sekarang.",
  featToolsBrowse: "Telusuri semua tool",
  featToolsInput: "Mime input",
  featToolsOutput: "Tipe output",
  featToolsOpen: "Buka tool",
  featToolsComing: "Segera hadir",

  // ── Home Page: AI Helper ─────────────────────────────────────────────────
  aiHelperBadge: "Asisten Kreatif Gemini",
  aiHelperTitle: "Rute cerdas untuk tugas aset kompleks",
  aiHelperSubtitle: "Tidak yakin konverter mana yang cocok dengan alur kerjamu? Beri tahu Asisten Kreatif kami apa yang ingin kamu buat dalam bahasa biasa.",
  aiHelperNote: "Catatan: Gemini bertindak sebagai arsitek penasihatmu. Perhitungan konversi berat berjalan pada node kompiler web di sandbox, menghindari penundaan server dan paparan data.",
  aiHelperTest: "Atau tes perintah langsung:",
  aiHelperPrompt1: "Saya butuh gambar PNG terpisah dari dokumen PDF ini",
  aiHelperPrompt2: "Saya ingin mengompres beberapa file JPG dan memperkecil ukurannya",
  aiHelperPrompt3: "Bagaimana cara melihat pratinjau file Lottie JSON dan memvalidasinya?",
  aiHelperQuestion: "Apa yang ingin kamu lakukan dengan asetmu?",
  aiHelperPlaceholder: "contoh: Saya ingin mengubah PDF menjadi slide individual lalu mengubah ukurannya untuk posting Instagram...",
  aiHelperCalc: "Menghitung langkah rute yang direkomendasikan",
  aiHelperConsult: "Konsultasi Asisten",
  aiHelperRouting: "Mengarahkan alur kerja...",
  aiHelperReport: "Laporan asisten",
  aiHelperPipeline: "Pipeline modul alur kerja",
  aiHelperSteps: "Langkah eksekusi",
  aiHelperFallbackMsg: "Tidak dapat mengklasifikasi alur kerja secara otomatis. Mari kita periksa seluruh kotak tool.",
  aiHelperFallbackStep1: "Telusuri indeks tool",
  aiHelperFallbackStep2: "Pilih modul proses individu",
  aiHelperErrorMsg: "Saran alur kerja: Konverter PDF ke PNG. Diikuti oleh Image Resizer.",
  aiHelperErrorStep1: "Unggah PDF di konverter",
  aiHelperErrorStep2: "Pilih skala ekspor",
  aiHelperErrorStep3: "Unduh ZIP yang sudah selesai",
} as const;

export default id;
