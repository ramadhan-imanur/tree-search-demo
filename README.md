# Panduan Deployment GitHub Pages: Live Demo Interaktif Kelompok 6
**Mata Kuliah:** Matematika Diskrit (09313120237) — Kelas A  
**Program Studi:** S-1 Matematika, Fakultas MIPA, Universitas Sebelas Maret (UNS)  
**Dosen Pengampu:** Prof. Drs. Tri Atmojo Kusmayadi, M.Sc., Ph.D.  
**Akun GitHub:** `ramadhan-imanur`

---

## 🎯 Mengapa Menggunakan GitHub Pages untuk Demo?
1. **0% Beban Laptop (Zero Overhead):** Seluruh komputasi graf, pencarian pohon (Tree-of-Thoughts), dan kalkulasi Entropi Shannon berjalan langsung di peramban web (*Client-Side V8 Engine*). Anda tidak perlu menyalakan Python server lokal atau proses background di laptop saat presentasi.
2. **Hanya Butuh Koneksi Internet:** Cukup buka link di browser laptop, tablet, atau PC proyektor kelas.
3. **Bisa Dibuka Langsung oleh Dosen:** Tautan web dapat dibagikan kepada Prof. Tri Atmojo Kusmayadi dan rekan-rekan mahasiswa agar mereka dapat mencoba interaktif langsung di gawai masing-masing.

---

## 🚀 Langkah Cepat 2 Menit untuk Mengaktifkan GitHub Pages

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [https://github.com/new](https://github.com/new) pada akun GitHub Anda (`ramadhan-imanur`).
2. Masukkan **Repository name**, misalnya: `tree-search-demo` (atau `matematika-diskrit-tree`).
3. Pilih opsi **Public**.
4. Biarkan opsi *Add a README file*, *.gitignore*, dan *license* **tidak dicentang** (kosong).
5. Klik **Create repository**.

---

### Langkah 2: Unggah Berkas ke GitHub Melalui Terminal
Buka terminal di komputer Anda, lalu jalankan perintah berikut:

```bash
cd "/media/ramadhan/0C6A-1ABD/University/Matematika Diskrit/riset/github_pages"

# Inisialisasi git lokal untuk web
git init
git add .
git commit -m "feat: Deploy interactive tree search & machine learning demo"
git branch -M main

# Hubungkan ke repository GitHub Anda (ganti URL jika nama repo berbeda)
git remote add origin https://github.com/ramadhan-imanur/tree-search-demo.git

# Push berkas ke GitHub
git push -u origin main
```

---

### Langkah 3: Aktifkan GitHub Pages (1x Klik)
1. Buka repository Anda di browser: `https://github.com/ramadhan-imanur/tree-search-demo`.
2. Klik tab **Settings** (di bilah atas menu repository).
3. Di menu sebelah kiri, klik menu **Pages** (pada bagian *Code and automation*).
4. Di bagian **Build and deployment**:
   * **Source:** Pilih `Deploy from a branch`
   * **Branch:** Pilih `main` dan folder `/ (root)`
   * Klik tombol **Save**.
5. Tunggu sekitar 30 detik. Refresh halaman Settings Pages, tautan publik Anda akan muncul:
   👉 **`https://ramadhan-imanur.github.io/tree-search-demo/`**

---

## 📱 Fitur yang Tersedia di GitHub Pages
* **Tab 1 — Machine Learning ToT & AEGTS:**
  * Komparasi 4 algoritma secara instan (*Linear CoT*, *Pure BFS*, *Pure DFS*, dan *AEGTS*).
  * Penghematan simpul (>70% vs DFS murni).
  * Grafik batang perbandingan ruang pencarian (*SVG Bar Chart*).
  * Visualisasi hierarki pohon deduktif langkah demi langkah (*Thought Tree*) dengan badge Entropi Shannon $\bar{\mathcal{H}}(s)$.
  * Slider hyperparameter interaktif ($\tau, \alpha, \delta$).
* **Tab 2 — Tracing Graf 8 Titik (Materi Makalah Bab III):**
  * Kanvas interaktif SVG Graf 8 Titik.
  * Tombol alih mode: Graf Asal $\to$ Spanning Tree BFS ($h=4$) $\to$ Spanning Tree DFS ($h=7$ dengan 4 *Back Edges*).
  * Tabel tracing langkah demi langkah (FIFO Queue vs LIFO Stack & Backtracking).
* **Tab 3 — Laporan Benchmark 25 Kasus Uji & Landasan Teori:**
  * Tabel metrik empiris dan formulasi matematis formal.
