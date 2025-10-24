import { Flasher } from './flasher.js';

const term = document.getElementById('terminal');
const info = document.getElementById('connInfo');
const chipInfo = document.getElementById('chipInfo');
const firmFile = document.getElementById('firmFile');
const btnFlash = document.getElementById('btnFlash');
const prog = document.getElementById('prog');
const progText = document.getElementById('progText');
const progressWrap = document.getElementById('progressWrap');
const errors = document.getElementById('errors');

let flasher = new Flasher({
  log: (m) => { term.textContent += m + '\n'; term.scrollTop = term.scrollHeight; },
  setStatus: (s) => info.textContent = s,
  onProgress: (p) => {
    progressWrap.style.display = 'block';
    prog.value = p;
    progText.textContent = `${Math.round(p)}%`;
  },
  onDone: () => info.textContent = "✅ Đã nạp xong firmware!"
});

document.getElementById('btnConnect').onclick = async () => {
  errors.textContent = '';
  try {
    const baud = parseInt(document.getElementById('baud').value);
    const chip = await flasher.connect(baud);
    chipInfo.textContent = `Chip: ${chip.chip}, MAC: ${chip.mac}`;
    document.getElementById('btnDisconnect').disabled = false;
    btnFlash.disabled = !flasher.hasFirmware();
  } catch (e) { errors.textContent = e.message; }
};

document.getElementById('btnDisconnect').onclick = async () => {
  await flasher.disconnect();
  chipInfo.textContent = "";
  document.getElementById('btnDisconnect').disabled = true;
};

firmFile.onchange = async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const buf = await f.arrayBuffer();
  flasher.setFirmware(new Uint8Array(buf), f.name);
  document.getElementById('firmInfo').textContent = `Firmware: ${f.name} (${buf.byteLength} bytes)`;
  btnFlash.disabled = !flasher.isReadyToFlash();
};

document.getElementById('btnLoadUrl').onclick = async () => {
  errors.textContent = '';
  const url = document.getElementById('firmUrl').value.trim();
  if (!url) { errors.textContent = 'Chưa nhập URL'; return; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không tải được URL: ' + res.status);
    const buf = await res.arrayBuffer();
    const name = url.split('/').pop() || 'firmware.bin';
    flasher.setFirmware(new Uint8Array(buf), name);
    document.getElementById('firmInfo').textContent = `Firmware: ${name} (${buf.byteLength} bytes)`;
    btnFlash.disabled = !flasher.isReadyToFlash();
  } catch (e) { errors.textContent = e.message; }
};

btnFlash.onclick = async () => {
  errors.textContent = '';
  try { await flasher.flash(); }
  catch (e) { errors.textContent = e.message; }
};
