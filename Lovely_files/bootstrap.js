/**
 * bootstrap.js — cấu hình, màn hình nhập mật khẩu, nhạc nền, loader.
 * Khôi phục (đọc được) từ đoạn script gốc nằm trong Lovely.html, giữ nguyên hành vi:
 *   - Cấu hình có thể truyền qua URL  ?d=<chuỗi LZString>  (hoặc ?id=...) theo định dạng
 *     tiêu đề | mật khẩu | lời nhắn | ảnh1~ảnh2 | nhạc   (lời nhắn nén bằng keypan.js).
 *   - Không có ?d= thì dùng CONFIG mặc định bên dưới.
 *   - Mật khẩu trống => bỏ qua màn hình khóa.
 * Phải nạp TRƯỚC app.js (app.js dùng TITLE_TEXT, LOVE_MESSAGE, PHOTO_LIST).
 */

/* ===== Cấu hình mặc định (theo video mẫu + cấu hình lưu trong URL gốc) ===== */
const CONFIG = {
  title: "Gửi chị, công chúa của em:3",
  // Mật khẩu lấy từ cấu hình gốc của dự án (trường thứ 2 trong ?d=): 2009
  passcode: "2009",
  message:
    "Chúc công chúa 20/10 thật hạnh phúc nhé! Mong rằng mỗi ngày trôi qua chị đều cảm thấy hạnh phúc ạa." +
    "Chúc chị luôn luôn xinh đẹp như một đóa hoa, mọi chuyện buồn rùi sẽ chóng qua, " +
    "bé iu chị nhìu lắm aa!",
  photos: [
    "assets/stickers/1.jpg",
    "assets/stickers/2.jpg",
    "assets/stickers/3.jpg",
    "assets/stickers/4.jpg",
    "assets/stickers/5.jpg",
    "assets/stickers/6.jpg",
    "assets/stickers/7.jpg",
    "assets/stickers/8.jpg",
    "assets/stickers/9.jpg",
    "assets/stickers/10.jpg",
    "assets/stickers/11.jpg",
    "assets/stickers/12.jpg",
    "assets/stickers/13.jpg",
    "assets/stickers/14.jpg",
    "assets/stickers/15.jpg",
    "assets/stickers/16.jpg",
    "assets/stickers/17.jpg",
    "assets/stickers/18.jpg",
    "assets/stickers/19.jpg",
    "assets/stickers/20.jpg",
    "assets/stickers/21.jpg",
    "assets/stickers/22.jpg",
    "assets/stickers/23.jpg",
  ],
  // Đặt file nhạc vào n/i.mp3 (hoặc đổi đường dẫn ở đây / qua ?d=). Thiếu file thì nút nhạc tự vô hiệu.
  music: "n/i.mp3",
};

let PASSCODE = CONFIG.passcode,
  TITLE_TEXT = CONFIG.title,
  LOVE_MESSAGE = CONFIG.message,
  PHOTO_LIST = CONFIG.photos.slice(),
  MUSIC = CONFIG.music;

/* ===== Đọc cấu hình từ URL (nếu có) ===== */
(function readConfigFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("d") || params.get("id");
  if (!encoded || typeof LZString === "undefined") return;
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return;
    const [rawTitle = "", rawPass = "", rawMsg = "", rawImages = "", rawMusic = ""] = raw.split("|");
    const expand = (t) =>
      window.Keypans && typeof window.Keypans.decompressWithDictionary === "function"
        ? window.Keypans.decompressWithDictionary(t)
        : t;
    if (rawTitle) TITLE_TEXT = expand(rawTitle);
    PASSCODE = rawPass || "";
    if (rawMsg) LOVE_MESSAGE = expand(rawMsg);
    if (rawImages) PHOTO_LIST = rawImages.split("~").filter(Boolean).map(fixImageUrl);
    if (rawMusic) MUSIC = rawMusic;
  } catch (err) {
    console.error("Lỗi giải mã cấu hình LZString:", err);
  }
})();

function fixImageUrl(u) {
  if (!u) return "";
  const s = u.trim();
  if (s.startsWith("assets/") || /^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}

/* ===== Phần tử DOM ===== */
const $ = (id) => document.getElementById(id);
const lockScreen = $("lock-screen");
const heartScreen_ = $("heart-screen");
const lockMsg = $("lock-msg");
const dotsWrap = document.querySelector(".pass-dots");

/* ===== Nhạc nền ===== */
let audioOk = true;
function renderMusic() {
  const box = $("music-container");
  if (!box) return;
  box.innerHTML = "";
  const ctrl = document.createElement("button");
  ctrl.type = "button";
  ctrl.className = "music-control";
  ctrl.setAttribute("aria-label", "Bật/tắt nhạc");
  ctrl.innerHTML = '<span class="disk" id="music-disk"></span><span class="music-label">Play Music</span>';
  ctrl.addEventListener("click", toggleMusic);
  const audio = document.createElement("audio");
  audio.id = "bg-music";
  audio.loop = true;
  audio.preload = "none";
  audio.src = MUSIC;
  audio.addEventListener("error", () => {
    audioOk = false;
    ctrl.classList.add("no-audio");
    $("music-disk")?.classList.remove("playing");
    console.warn("Không tải được file nhạc:", MUSIC, "— hãy đặt file mp3 vào đường dẫn này.");
  });
  box.append(ctrl, audio);
}

function toggleMusic() {
  const audio = $("bg-music");
  const disk = $("music-disk");
  if (!audio || !audioOk) return;
  if (audio.paused) {
    audio.play().then(() => disk?.classList.add("playing")).catch((e) => console.log("Audio play blocked:", e));
  } else {
    audio.pause();
    disk?.classList.remove("playing");
  }
}
window.toggleMusic = toggleMusic;

/* ===== Màn hình nhập mật khẩu ===== */
let currentInput = "";
let busy = false; // đang hiển thị lỗi / đang mở khóa => bỏ qua mọi thao tác thêm
let locked = !!PASSCODE;
let dots = [];

function buildDots() {
  const n = Math.max(1, PASSCODE.length || 4);
  dotsWrap.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "dot";
    dotsWrap.appendChild(d);
  }
  dots = Array.from(dotsWrap.children);
}

function updateDots() {
  dots.forEach((d, i) => d.classList.toggle("filled", i < currentInput.length));
  dotsWrap.setAttribute("aria-label", `Đã nhập ${currentInput.length}/${dots.length} số`);
}

function setMsg(text, kind) {
  lockMsg.textContent = text || "";
  lockMsg.className = "lock-msg" + (kind ? " " + kind : "");
}

function press(digit) {
  if (!locked || busy || currentInput.length >= dots.length) return;
  currentInput += String(digit);
  setMsg("");
  updateDots();
  if (currentInput.length === dots.length) checkPass();
}

function backspace() {
  if (!locked || busy || !currentInput) return;
  currentInput = currentInput.slice(0, -1);
  updateDots();
}

function clearInput() {
  if (!locked || busy) return;
  currentInput = "";
  setMsg("");
  updateDots();
  dots.forEach((d) => d.classList.remove("error"));
}

function checkPass() {
  busy = true;
  if (currentInput === PASSCODE) {
    dots.forEach((d) => d.classList.add("ok"));
    setMsg("Đúng rồi nè 💗", "ok");
    setTimeout(() => {
      lockScreen.classList.remove("active");
      heartScreen_.classList.add("active");
      locked = false;
      busy = false;
      toggleMusicIfPaused();
    }, 800);
  } else {
    dots.forEach((d) => d.classList.add("error"));
    setMsg("Sai mất rồi, thử lại nha 🥺", "err");
    setTimeout(() => {
      currentInput = "";
      updateDots();
      dots.forEach((d) => d.classList.remove("error"));
      busy = false;
    }, 700);
  }
}

function toggleMusicIfPaused() {
  const a = $("bg-music");
  if (a && a.paused) toggleMusic();
}

window.press = press;
window.clearInput = clearInput;

/* Sự kiện bàn phím số: ủy quyền 1 listener duy nhất (không đăng ký trùng) */
lockScreen.addEventListener("click", (e) => {
  const btn = e.target.closest(".num-btn[data-key]");
  if (!btn) return;
  const k = btn.dataset.key;
  if (k === "clear") clearInput();
  else press(k);
});

document.addEventListener("keydown", (e) => {
  if (!locked || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === "Backspace") backspace();
  else if (e.key === "Escape") clearInput();
});

/* ===== Khởi động ===== */
renderMusic();

if (!PASSCODE) {
  // Không có mật khẩu: vào thẳng màn hình bó hoa, nhạc bật ở lần chạm đầu tiên (chính sách autoplay).
  lockScreen.classList.remove("active");
  heartScreen_.classList.add("active");
  const unlockAudio = () => {
    toggleMusicIfPaused();
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio);
  window.addEventListener("touchstart", unlockAudio, { passive: true });
} else {
  buildDots();
  updateDots();
}

/* Loader: ẩn sau khi tải xong, có chốt an toàn để không bao giờ kẹt ở màn hình loading */
function hideLoader() {
  const l = $("loader-wrapper");
  if (l) l.classList.add("hide");
}
if (document.readyState === "complete") setTimeout(hideLoader, 300);
else window.addEventListener("load", () => setTimeout(hideLoader, 300));
setTimeout(hideLoader, 4000);
