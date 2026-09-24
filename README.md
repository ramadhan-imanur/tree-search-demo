# Platform Simulasi Interaktif: Karakterisasi Tree & Spanning Tree
## Serta Pengembangan Algoritma Hibrida Adaptif pada Machine Learning Reasoning (Tree-of-Thoughts)

**Author:** Ramadhan Imanur  
**Repository:** [ramadhan-imanur/tree-search-demo](https://github.com/ramadhan-imanur/tree-search-demo)  
**Project Type:** Proyek Riset Mandiri (Independent Open Source Project)  

---

## 🌐 Akses Live Demo Interaktif (Online Deployment)

Aplikasi web simulasi ini telah di-deploy dan dapat diakses secara publik melalui dua tautan *cloud* berikut (100% *serverless*, bebas beban prosesor, dan dapat dibuka di HP, laptop, maupun tablet):

* 🚀 **Vercel Deployment (Utama):**  
  👉 **[https://tree-search-demo.vercel.app/](https://tree-search-demo.vercel.app/)**

* 🐙 **GitHub Pages Deployment (Mirror):**  
  👉 **[https://ramadhan-imanur.github.io/tree-search-demo/](https://ramadhan-imanur.github.io/tree-search-demo/)**

---

## 📌 Ringkasan Fitur Aplikasi Web

Aplikasi web interaktif ini memvisualisasikan riset komparasi algoritma dan penelusuran graf secara komprehensif melalui 3 tab utama:

### 1. 🧠 Inovasi Machine Learning (Tree-of-Thoughts & AEGTS)
* **Komparasi 4 Paradigma Penelusuran Pohon Keadaan:**
  1. *Linear Chain-of-Thought (CoT)* — Penalaran greedy linear.
  2. *Pure ToT-BFS* — Eksplorasi melebar menggunakan antrean FIFO berpenjamin geodesik.
  3. *Pure ToT-DFS* — Penyelaman mendalam tumpukan LIFO dengan backtracking.
  4. *Adaptive AEGTS (Adaptive Entropy-Guided Tree Search)* — Penelusuran hibrida terpandu Entropi Shannon $\bar{\mathcal{H}}(s)$ dengan *Predictive Early Backtracking* $\Delta V < -\delta$.
* **Penghematan Komputasi Riil:** Membuktikan reduksi evaluasi simpul hingga **>70%** dibandingkan DFS murni.
* **Diagram Pohon Deduktif Interaktif (*Thought Tree*):** Menampilkan hierarki langkah pemikiran dari Aras 0 (*Root*) ke Aras 3 (*Goal 24*) beserta badge nilai entropi ternormalisasi.
* **Grafik Batang Perbandingan Ukuran Ruang Pencarian (*SVG Bar Chart*).**
* **Preset Kasus Cepat & Kustomisasi Bilangan:** Pilihan instan `[1, 2, 3, 4]`, `[6, 6, 6, 6]`, `[4, 5, 6, 7]`, `[4, 1, 8, 7]`, `[2, 4, 6, 8]`, `[3, 3, 8, 8]`, atau memasukkan 4 angka bebas.
* **Tuning Hyperparameter:** Slider interaktif untuk ambang entropi $\tau$, pemangkasan nilai $\alpha$, dan toleransi rollback $\delta$.

### 2. 🕸️ Teori Graf Diskrit: Tracing Graf Uji 8 Titik (BFS vs DFS)
* **Kanvas Graf Interaktif (SVG):** Menampilkan graf uji acuan terhubung seragam berordo 8 titik ($|V|=8$) dan berukuran 11 sisi ($|E|=11$).
* **Tombol Alih Mode Rekonstruksi:**
  * *Graf Asal:* Menampilkan seluruh 11 sisi awal.
  * *Pohon Rentang BFS ($h=4$):* Menyorot 7 sisi pohon berwarna hijau dan 4 sisi tali busur (*chords*) putus-putus abu-abu.
  * *Pohon Rentang DFS ($h=7$):* Menyorot 7 sisi rantai pohon berwarna ungu dan 4 sisi kembali (*Back Edges*) berwarna merah untuk deteksi sikel.
* **Tabel Penelusuran Langkah demi Langkah:** Status antrean FIFO vs tumpukan LIFO & peristiwa *backtracking*.
* **Tabel Analisis Komparatif Morfologi:** Kontras dangkal-lebar (*bushy*) vs tinggi-ramping (*stringy*), jaminan geodesik, dan skenario penerapan (STP IEEE 802.1D vs deteksi deadlock).

### 3. 📊 Laporan Benchmark & Teorema Matematis
* **Rekapitulasi 25 Kasus Uji Baku Game of 24** (Mudah, Sedang, Sulit).
* **Formulasi Teorema Formal:**
  * Relasi Invarian Pohon: $|E| = |V| - 1$ (Induksi Matematika via Lema Daun).
  * Entropi Ternormalisasi Shannon: $\bar{\mathcal{H}}(s) = -\frac{1}{\ln k} \sum p_i \ln p_i$.
  * Syarat Pemotongan Dini: $\Delta V < -\delta$.

---

## 👤 Pengembang Proyek

Proyek ini dikembangkan secara mandiri oleh **Ramadhan Imanur** sebagai eksplorasi interdisipliner antara matematika diskrit (teori graf dan algoritma penelusuran pohon) dan penalaran model kecerdasan buatan (*Machine Learning / Tree-of-Thoughts Reasoning*).

---

## 🛠️ Menjalankan Secara Lokal (Opsional)

Jika ingin menjalankan aplikasi secara lokal di komputer:
```bash
# Clone repositori
git clone git@github.com:ramadhan-imanur/tree-search-demo.git
cd tree-search-demo

# Buka langsung file index.html di browser atau gunakan Five Server di VS Code:
# Klik kanan index.html -> Open with Five Server
```

---
*© 2026 Ramadhan Imanur. Proyek Riset Mandiri (Independent Open Source Project).*
