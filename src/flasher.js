export class Flasher {
  constructor(ops = {}) {
    this.device = null;
    this.firmware = null;
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
    this.name = name;
  }

  async connect(baud = 115200) {
    if (!('serial' in navigator)) throw new Error('Trình duyệt không hỗ trợ Web Serial API.');
    this.device = await navigator.serial.requestPort();
    await this.device.open({ baudRate: baud });
    this.setStatus(`Đã kết nối (baud ${baud})`);
    this.log(`Serial opened @${baud}`);
  }

  async disconnect() {
    if (this.device) {
      await this.device.close();
      this.device = null;
      this.setStatus('Đã ngắt kết nối');
      this.log('Disconnected');
    }
  }

  async flash() {
    if (!window.ESPLoader) throw new Error('esptool-js chưa được load.');
    if (!this.device) throw new Error('Chưa kết nối thiết bị.');
    if (!this.firmware) throw new Error('Chưa chọn firmware.');

    this.log('Bắt đầu flash...');
    const transport = new window.Transport(this.device);
    const loader = new window.ESPLoader(transport, 921600);
    await loader.initialize();
    this.log('Đã nhận diện chip.');

    const address = 0x1000;
    const fileArray = [{ data: this._toLatin1(this.firmware), address }];
    await loader.flashData(fileArray, {
      onProgress: (p) => this.onProgress(p),
      compress: true
    });

    this.log('✅ Hoàn tất flash!');
    this.onProgress(100);
    this.onDone();
  }

  _toLatin1(u8) {
    return Array.from(u8).map(c => String.fromCharCode(c)).join('');
  }
}
