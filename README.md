# AI Box Flasher — Minimal

Phiên bản minimal để public lên GitHub Pages. Gồm:
- Kết nối Web Serial
- Tải firmware (file local hoặc URL)
- Terminal / log
- Flash (nếu thêm `esptool-js` bundle)

## Cách chạy trên local
Mở `index.html` bằng web server (do Chrome chặn `file://` cho Web Serial). Ví dụ:
```bash
# cài http-server (node)
npm i -g http-server
http-server . -c-1
# Truy cập http://localhost:8080
