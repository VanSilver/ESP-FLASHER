// src/main.js
import { Flasher } from './flasher.js';

const btnConnect = document.getElementById('btnConnect');
const btnDisconnect = document.getElementById('btnDisconnect');
const baudEl = document.getElementById('baud');
const connInfo = document.getElementById('connInfo');

const firmFile = document.getElementById('firmFile');
const firmUrl = document.getElementById('firmUrl');
const btnLoadUrl = document.getElementById('btnLoadUrl');
const firmInfo = document.getElementById('firmInfo');

const btnFlash = document.getElementById('btnFlash');
const prog = document.getElementById('prog');
const progText = document.getElementById('progText');
const progressWrap = document.getElementById('progressWrap');

const terminal = document.getElementById('terminal');
const errors = document.getElementById('errors');

let flasher = new Flasher({
  log: (line) => {
    terminal.textContent += line + '\n';
    terminal.scrollTop = terminal.scrollHeight;
  },
  setStatus: (s) => { connInfo.textContent = s; },
  onProgress: (p) => {
    progressWrap.style.display = 'block';
    prog.value = Math.round(p);
    progText.textContent = Math.round(p) + '%';
  },
  onDone: () => {
    btnFlash.disabled = true;
  },
  onError: (e) => {
    errors.textContent = (e && e.message) ? e.message : String(e);
  }
});

btnConnect.addEventListener('click', async () => {
  errors.textContent = '';
  try {
    await flasher.connect(parseInt(baudEl.value, 10));
    btnDisconnect.disabled = false;
    btnConnect.disabled = true;
    btnFlash.disabled = !flasher.hasFirmware();
  } catch (e) {
    errors.textContent = e.message || e;
  }
});

btnDisconnect.addEventListener('click', async () => {
  await flasher.disconnect();
  btnDisconnect.disabled = true;
  btnConnect.disabled = false;
  connInfo.textContent = 'Chưa kết nối';
});

firmFile.addEventListener('change', async (ev) => {
  errors.textContent = '';
  const f = ev.target.files[0];
  if (!f) return;
  const buf = await f.arrayBuffer();
  flasher.setFirmware(new Uint8Array(buf), f.name);
  firmInfo.textContent = `Firmware: ${f.name} (${buf.byteLength} bytes)`;
  btnFlash.disabled = !flasher.isReadyToFlash();
});

btnLoadUrl.addEventListener('click', async () => {
  errors.textContent = '';
  const url = firmUrl.value.trim();
  if (!url) { errors.textContent = 'Chưa nhập URL'; return; }
  try {
    firmInfo.textContent = 'Đang tải từ URL...';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không tải được URL: ' + res.status);
    const buf = await res.arrayBuffer();
    const name = url.split('/').pop() || 'firmware.bin';
    flasher.setFirmware(new Uint8Array(buf), name);
    firmInfo.textContent = `Firmware: ${name} (${buf.byteLength} bytes)`;
    btnFlash.disabled = !flasher.isReadyToFlash();
  } catch (e) {
    errors.textContent = e.message || e;
    firmInfo.textContent = 'Chưa có firmware';
  }
});

btnFlash.addEventListener('click', async () => {
  errors.textContent = '';
  btnFlash.disabled = true;
  try {
    await flasher.flash();
  } catch (e) {
    errors.textContent = e.message || e;
  } finally {
    btnFlash.disabled = false;
  }
});

// On load: check if esptool-js is present (optional)
window.addEventListener('load', () => {
  if (!('serial' in navigator)) {
    errors.textContent = 'Trình duyệt không hỗ trợ Web Serial API. Dùng Chrome/Edge mới nhất.';
  }
});
