# Keyvault — API Key Manager

Website sederhana untuk menyimpan dan mengelola API key secara lokal menggunakan HTML, CSS, dan Vanilla JavaScript.

## Menjalankan

1. Ekstrak folder project.
2. Buka `index.html` di browser, atau jalankan server lokal:
   ```bash
   python -m http.server 8000
   ```
3. Buka `http://localhost:8000`.

## Fitur

- Tambah, edit, dan hapus API key
- Tampilkan/sembunyikan API key
- Salin API key
- Checkbox status limit
- Pencarian dan filter
- Statistik total, available, dan limit
- Export backup JSON
- Penyimpanan LocalStorage

## Catatan keamanan

LocalStorage menyimpan data tanpa enkripsi. Jangan gunakan untuk API key sensitif pada perangkat bersama atau browser yang tidak tepercaya. Jangan deploy sebagai aplikasi publik untuk menyimpan secret. Export JSON juga berisi API key dalam bentuk teks biasa.
