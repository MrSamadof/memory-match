# 🧠 Memory Match — Xotira o'yini

Brauzerda ochiladigan, **hech qanday kutubxona, framework yoki build-tool talab qilmaydigan**
xotira o'yini. Faqat HTML, CSS va vanilla JavaScript.

## ✨ Xususiyatlar

- 🃏 **3D karta aylanish animatsiyasi** (CSS `rotateY` + `preserve-3d`)
- 🎚 **3 daraja** — Oson (12 karta), O'rta (16 karta), Qiyin (24 karta)
- ⏱ **Taymer** — birinchi karta ochilganda ishga tushadi (mm:ss)
- 👆 **Harakatlar hisobi** va **ochko tizimi**
- 🏆 **G'alaba ekrani** — vaqt, harakatlar, vaqt bonusi va yakuniy ochko
- 🔄 **Qayta boshlash** tugmasi
- 📱 **Responsive** — 480px va 768px breakpointlar, mobilda tugmalar 44px+
- ♿ **Klaviatura va screen reader** uchun moslashgan (`<button>` + `aria-label`)
- 🎨 Gradient fon, glassmorphism panellar, `prefers-reduced-motion` qo'llab-quvvatlanadi

## 📁 Fayl tuzilishi

```
memory-match/
├── index.html        # Sahifa strukturasi
├── css/
│   └── style.css     # Dizayn, animatsiyalar, responsive
├── js/
│   └── game.js       # O'yin mantig'i (IIFE, global scope toza)
├── assets/           # Rasm/ikonkalar uchun (hozircha bo'sh)
└── README.md
```

## 🚀 Ishga tushirish

**1-usul — eng oddiy:**
`index.html` faylini brauzerda ikki marta bosib oching. Server kerak emas.

**2-usul — lokal server (ixtiyoriy):**

```bash
git clone https://github.com/MrSamadof/memory-match.git
cd memory-match
python3 -m http.server 8000
# brauzerda: http://localhost:8000
```

**3-usul — GitHub Pages:**
Repo → Settings → Pages → Branch: `main` / `root` → Save.

## 🎮 O'yin qoidalari

1. Barcha kartalar teskari yotadi.
2. Ikkita kartani oching.
3. Belgilar bir xil bo'lsa — kartalar ochiq qoladi (yashil rang + pulse animatsiya).
4. Bir xil bo'lmasa — 0.8 soniyadan keyin yopiladi (qizil shake animatsiya).
5. Barcha juftlar topilganda g'alaba ekrani chiqadi.

## 🧮 Ochko formulasi

| Hodisa | Ochko |
|---|---|
| To'g'ri juft | **+100** |
| Noto'g'ri juft | **−20** (0 dan pastga tushmaydi) |
| Vaqt bonusi (g'alabada) | **max(0, parTime − ketgan_vaqt) × 5** |

`parTime`: Oson — 60s, O'rta — 90s, Qiyin — 150s.

**Misol:** O'rta daraja, 70 sekundda, 10 harakat bilan tugatilsa →
8 × 100 = 800, bonus = (90 − 70) × 5 = 100 → **900 ochko**.

## ⌨️ Klaviatura

- **Tab** — kartalar va tugmalar bo'ylab harakatlanish
- **Enter / Space** — kartani ochish

## 🛠 Texnik tafsilotlar

- Kartalar har o'yinda **Fisher–Yates** algoritmi bilan aralashtiriladi.
- Butun holat bitta `state` obyektida saqlanadi.
- Ikki karta tekshirilayotganda taxta bloklanadi (`state.locked`) — uchinchi kartani bosib bo'lmaydi.
- Har o'yinga `roundId` beriladi va noto'g'ri juftni yopadigan `setTimeout`
  qayta boshlashda bekor qilinadi — eski taymer yangi o'yinga aralashmaydi.
- `localStorage`/`sessionStorage` ishlatilmaydi — `file://` orqali ham muammosiz ishlaydi.

## 📄 Litsenziya

MIT
