// src/flasher.js
export class Flasher {
  constructor(ops = {}) {
    this.device = null;
    this.transport = null;
    this.esploader = null;
    this.firmware = null; // Uint8Array
    this.fwName = '';
    this.log = ops.log || (() => {});
    this.setStatus = ops.setStatus || (() => {});
    this.onProgress = ops.onProgress || (() => {});
    this.onDone = ops.onDone || (() => {});
    this.onError = ops.onError || (() => {});
  }

  hasFirmware() { return !!this.firmware; }
  isReadyToFlash() { return this.device && this.firmware; }

  setFirmware(uint8Array, name = 'firmware.bin') {
    this.firmware = uint8Array;
    this.fwName = name;
  }

  async connect(baud = 115200) {
    if (!('serial' in navigator)) throw new Error('Web Serial API không được hỗ trợ.');
    this.setStatus('Yêu cầu chọn cổng...');
    try {
      this.device = await navigator.serial.requestPort();
      await this.device.open({ baudRate: baud });
      this.setStatus(`Đã kết nối (baud ${baud})`);
      this.log(`Opened serial (baud ${baud})`);
      // Simple transport wrapper for raw read/write
      this.transport = {
        port: this.device,
        async write(buffer) {
          const writer = this.device.writable.getWriter();
          await writer.write(buffer);
          writer.releaseLock();
        },
        async readLoop(onChunk) {
          const reader = this.device.readable.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) onChunk(value);
            }
          } finally {
            reader.releaseLock();
          }
        },
        async disconnect() {
          if (this.device) {
            try { await this.device.close(); } catch(e) {}
          }
        }
      };
    } catch (e) {
      this.setStatus('Chưa kết nối');
      this.onError(e);
      throw e;
    }
  }

  async disconnect() {
    try {
      if (this.device && this.device.readable) {
        await this.device.close();
      }
    } catch (e) {
      this.log('Disconnect error: ' + e);
    } finally {
      this.device = null;
      this.transport = null;
      this.setStatus('Chưa kết nối');
    }
  }

  // Main flash flow — uses esptool-js if present
  async flash() {
    if (!this.firmware) throw new Error('Chưa có firmware để nạp.');
    if (!this.device) throw new Error('Chưa kết nối thiết bị.');
    // If esptool-js is present as ESPLoader (from bundle), use it
    if (window.ESPLoader) {
      try {
        this.log('Bắt đầu flash bằng esptool-js...');
        // Build LoaderOptions similar to esptool examples
        const opts = {
          transport: new window.Transport(this.device, true),
          baudrate: 921600,
          terminal: {
            write: (d) => this.log(String(d)),
            writeLine: (d) => this.log(String(d)),
            clean: () => {}
          },
          debugLogging: false
        };
        // eslint-disable-next-line no-undef
        this.esploader = new window.ESPLoader(opts);
        const chip = await this.esploader.main();
        this.log('Detected chip: ' + chip);
        // Prepare FlashOptions: a single file at 0x1000 by default (user can modify)
        const fileArray = [{ address: 0x1000, data: this._uint8ArrayToLatin1(this.firmware) }];
        const flashOptions = {
          fileArray,
          eraseAll: false,
          compress: true,
          reportProgress: (fileIndex, written, total) => {
            const p = (written / total) * 100;
            this.onProgress(p);
          },
          calculateMD5Hash: (image) => {
            return window.CryptoJS ? window.CryptoJS.MD5(window.CryptoJS.enc.Latin1.parse(image)) : null;
          }
        };
        await this.esploader.writeFlash(flashOptions);
        await this.esploader.after('hard_reset');
        this.onProgress(100);
        this.onDone();
        this.log('Flash hoàn tất.');
      } catch (e) {
        this.onError(e);
        throw e;
      } finally {
        // attempt disconnect
        try { if (this.transport && this.transport.disconnect) await this.transport.disconnect(); } catch(e){}
      }
    } else {
      // esptool-js not loaded. Provide clear error.
      const err = new Error('esptool-js bundle chưa được load. Để bật chức năng flash, chèn <script type="module" src="https://unpkg.com/esptool-js@<version>/dist/bundle.js"></script> vào index.html. (Xem README)');
      this.onError(err);
      throw err;
    }
  }

  _uint8ArrayToLatin1(u8) {
    // esptool-js in this repo expects Latin1 string in some implementations.
    // Convert safely for moderate-sized files
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  }
}
