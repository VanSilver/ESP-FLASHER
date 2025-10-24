export class Flasher {
  constructor(opts = {}) {
    this.log = opts.log || console.log;
    this.setStatus = opts.setStatus || (() => {});
    this.onProgress = opts.onProgress || (() => {});
    this.onDone = opts.onDone || (() => {});
    this.onError = opts.onError || console.error;

    this.device = null;
    this.firmware = null;
    this.loader = null;
  }

  setFirmware(uint8Array, name = 'firmware.bin') {
    this.firmware = uint8Array;
    this.fileName = name;
  }

  hasFirmware() { return !!this.firmware; }
  isReadyToFlash() { return !!(this.device && this.firmware); }

  async connect(baud = 115200) {
    if (!('serial' in navigator)) throw new Error("Trình duyệt không hỗ trợ Web Serial API.");
    this.device = await navigator.serial.requestPort();
    await this.device.open({ baudRate: baud });

    this.setStatus(`Đã mở cổng serial @${baud}`);
    const transport = new window.Transport(this.device);
    this.loader = new window.ESPLoader(transport, baud);

    await this.loader.initialize();
    const chip = this.loader.chip;
    const mac = await this.loader.read_mac();
    const flashId = await this.loader.read_flash_id();

    this.chipInfo = { chip, mac, flashId };
    this.setStatus(`Nhận diện: ${chip}`);
    this.log(`Kết nối ${chip}, FlashID: ${flashId.toString(16)}, MAC: ${mac}`);

    return this.chipInfo;
  }

  async disconnect() {
    if (this.device) {
      await this.device.close();
      this.device = null;
      this.setStatus("Đã ngắt kết nối.");
    }
  }

  async flash() {
    if (!window.ESPLoader) throw new Error("esptool-js chưa load.");
    if (!this.device) throw new Error("Chưa kết nối thiết bị.");
    if (!this.firmware) throw new Error("Chưa chọn firmware.");

    const chip = this.chipInfo?.chip || "Unknown";
    const address = this._getFlashAddr(chip);

    this.log(`Bắt đầu flash cho ${chip} tại 0x${address.toString(16)}...`);
    const transport = new window.Transport(this.device);
    const loader = new window.ESPLoader(transport, 921600);

    await loader.initialize();
    await loader.flashData(
      [{ data: this._u8ToString(this.firmware), address }],
      { onProgress: (p) => this.onProgress(p), compress: true }
    );

    this.log("✅ Hoàn tất flash!");
    this.onDone();
  }

  _getFlashAddr(chip) {
    const addr = {
      ESP8266: 0x0000,
      ESP32: 0x1000,
      ESP32S2: 0x1000,
      ESP32S3: 0x0000,
      ESP32C3: 0x0000,
      ESP32C6: 0x0000,
      ESP32H2: 0x0000
    };
    return addr[chip?.toUpperCase()] || 0x1000;
  }

  _u8ToString(u8) {
    return Array.from(u8).map(x => String.fromCharCode(x)).join('');
  }
}
