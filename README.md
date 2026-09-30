# Pohon Penelusuran & *Spanning Tree*

Simulasi interaktif algoritma penelusuran graf dan penalaran *Tree-of-Thoughts* pada Game of 24 menggunakan *Adaptive Entropy-Guided Tree Search* (AEGTS).

* **Penulis:** Ramadhan Imanur
* **Repositori:** [ramadhan-imanur/tree-search-demo](https://github.com/ramadhan-imanur/tree-search-demo)
* **Lisensi:** Open Source

---

## Demo Interaktif

Aplikasi ini dapat langsung diakses melalui peramban tanpa instalasi:

* **Vercel:** [https://tree-search-demo.vercel.app/](https://tree-search-demo.vercel.app/)
* **GitHub Pages:** [https://ramadhan-imanur.github.io/tree-search-demo/](https://ramadhan-imanur.github.io/tree-search-demo/)

---

## Fitur Utama

Aplikasi ini mendemonstrasikan perbandingan algoritma penelusuran graf dan penalaran model melalui empat bagian utama:

### 1. Penalaran Mesin (Game of 24)
* **Perbandingan Empat Metode Penelusuran:**
  1. *Linear Chain-of-Thought (CoT):* penelusuran satu jalur langsung (*greedy*) tanpa cabang cadangan.
  2. *Pure ToT-BFS:* penelusuran melebar dengan antrean FIFO yang menjamin rute terpendek.
  3. *Pure ToT-DFS:* penelusuran mendalam dengan tumpukan LIFO dan pelacakan balik (*backtracking*).
  4. *Adaptive AEGTS:* penelusuran terpandu Entropi Shannon $\bar{\mathcal{H}}(s)$ yang beralih antara BFS dan DFS secara adaptif disertai pemangkasan cabang.
* **Efisiensi Langkah:** Menghemat evaluasi verteks hingga lebih dari 70% dibanding DFS murni pada parameter yang sesuai.
* **Pohon Pemikiran (*Thought Tree*):** Visualisasi hierarki langkah dari verteks akar sampai solusi target 24 beserta nilai entropinya.
* **Grafik Batang Komparatif:** Perbandingan jumlah verteks yang dievaluasi oleh masing-masing metode.
* **Preset dan Kustomisasi:** Pilihan bilangan cepat (`[1, 2, 3, 4]`, `[6, 6, 6, 6]`, `[4, 5, 6, 7]`, `[4, 1, 8, 7]`, `[2, 4, 6, 8]`, `[3, 3, 8, 8]`) atau input angka mandiri.
* **Pengaturan Parameter:** Slider interaktif untuk ambang entropi $\tau$, batas pemangkasan nilai $\alpha$, dan ambang penurunan nilai $\delta$.

### 2. Morfologi Graf & *Spanning Tree*
* **Dekomposisi Pembentukan *Edge*:** Memperlihatkan bagaimana setiap metode membentuk subgraf penelusuran (*search spanning tree*) untuk angka aktif.
* **Karakteristik Setiap Metode:**
  * *Linear CoT:* rantai lurus (*bamboo graph*) dengan panjang jalur $k=3$ tanpa percabangan.
  * *Pure ToT-BFS:* pohon melebar rimbun (*bushy tree*) yang mengevaluasi antrean lapis demi lapis.
  * *Pure ToT-DFS:* pohon memanjang ke bawah (*stringy tree*) dengan penyelaman ke satu cabang dan pelacakan balik saat buntu.
  * *Adaptive AEGTS:* pohon terpandu yang ramping, memadukan BFS saat ragu ($\bar{\mathcal{H}} \ge \tau$) dan DFS saat arah solusi mulai jelas ($\bar{\mathcal{H}} < \tau$).
* **Dekomposisi Khusus Per Metode:** Sub-tampilan individual untuk melihat alur detail, urutan transisi *edge*, dinamika antrean/tumpukan, dan diagram Mermaid tiap metode.
* **Tabel Ringkasan Morfologi:** Perbandingan bentuk graf, verteks yang dievaluasi, memori puncak, strategi penelusuran, dan mekanisme pemangkasan.

### 3. Graf Uji 8 Titik (BFS vs DFS)
* **Visualisasi Graf Interaktif (SVG):** Menampilkan graf terhubung dengan 8 verteks ($|V|=8$) dan 11 *edge* ($|E|=11$).
* **Pilihan Mode Tampilan:**
  * *Graf Asal:* menampilkan seluruh 11 *edge* awal.
  * *Spanning Tree* BFS ($h=4$): menyorot 7 *edge* pohon penelusuran melebar dan 4 *edge* silang (*cross-edges*).
  * *Spanning Tree* DFS ($h=7$): menyorot 7 *edge* pohon penelusuran mendalam dan 4 *edge* balik (*back-edges*) untuk deteksi sikel.
* **Tabel Tracing Langkah per Langkah:** Riwayat perubahan struktur data (antrean FIFO vs tumpukan LIFO) serta pencatatan *edge* yang ditambahkan ke pohon.
* **Perbandingan Teoretis:** Analisis perbedaan bentuk pohon (melebar vs mendalam), jaminan rute terpendek, dan kasus penggunaannya.

### 4. Hasil Pengujian & Teori
* **Hasil Pengujian 25 Kasus:** Rekapitulasi perbandingan performa akurasi, rerata verteks, dan memori puncak dari keempat metode.
* **Rumus Matematis:**
  * Teorema Invarian Pohon: $|E| = |V| - 1$ untuk setiap pohon dengan $|V|$ verteks.
  * Entropi Shannon Ternormalisasi: $\bar{\mathcal{H}}(s) = -\frac{1}{\ln k} \sum_{i=1}^{k} \pi(a_i \mid s) \ln \pi(a_i \mid s)$.
  * Kriteria Pemangkasan Dini: $\Delta V < -\delta$.
  * Bilangan Siklomatik Graf: $\mu(G) = |E| - |V| + 1 = 4$, yaitu jumlah *edge* yang perlu dieliminasi untuk membentuk *spanning tree*.

---

## Menjalankan Secara Lokal

Aplikasi ini berjalan langsung pada peramban (*client-side* menggunakan HTML, CSS, dan JavaScript) tanpa memerlukan server backend:

```bash
# Klon repositori
git clone git@github.com:ramadhan-imanur/tree-search-demo.git
cd tree-search-demo

# Buka file index.html langsung di peramban:
# Linux
xdg-open index.html

# macOS
open index.html

# Windows
start index.html
```

Atau gunakan ekstensi server lokal seperti *Live Server* / *Five Server* di VS Code.

---

## Lisensi

Proyek riset mandiri oleh Ramadhan Imanur (2026). Dirilis di bawah lisensi terbuka untuk keperluan edukasi dan riset.
