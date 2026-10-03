export function icon(id, cls = '') {
  const shapes = {
    brush: '<path d="m24 43 20-32 5 3-20 32" fill="#b88b55"/><path d="m24 39 8 5-7 10-11 4 3-11z" fill="#454b43"/><path d="m26 39 7 5" stroke="#e1c583" stroke-width="4"/>',
    book: '<path d="M13 15h28q7 0 7 6v31H19q-6 0-6-6z" fill="#8aab94"/><path d="M19 15v37M23 44h18"/><path d="M25 21h16v16H25z" fill="#fbf5da" stroke="none"/><path d="M30 26h6m-6 5h6" stroke="#71866d"/><path d="M14 45h33"/>',
    mapae: '<path d="m26 18-1-9h13l-2 9" fill="#b38853"/><circle cx="31" cy="35" r="21" fill="#dfb964"/><circle cx="31" cy="35" r="16" fill="none" stroke="#af853e"/><path d="m20 38 5-11 6 4 8-3 5 7-5 3-1 7m-9-8-4 8m2-16 3-7 4 6" fill="none" stroke="#9c7138"/>',
    thread: '<path d="M23 13h20v40H23z" fill="#e9c5b7"/><ellipse cx="33" cy="14" rx="15" ry="5" fill="#eee1c9"/><ellipse cx="33" cy="52" rx="15" ry="5" fill="#eee1c9"/><path d="m22 23 21-4m-21 11 21-4m-21 11 21-4m-21 11 21-4m-2 10q17 1 13 10" stroke="#b67d70" fill="none"/>',
    coin: '<circle cx="26" cy="39" r="18" fill="#d4a84f"/><circle cx="39" cy="25" r="18" fill="#ebc66d"/><circle cx="39" cy="25" r="14" fill="none" stroke="#bb9444"/><path d="M34 20h10v10H34z" fill="#fbf5e5"/><path d="M17 35h9v10h-9z" fill="#fbf5e5"/>',
    stethoscope: '<path d="M15 12v17q0 16 19 16t19-10v-7M15 12h6m12 0h6v17q0 11-12 11" fill="none" stroke="#718d82" stroke-width="5"/><circle cx="52" cy="22" r="8" fill="#e2b876"/><circle cx="52" cy="22" r="4" fill="#f4e4c5"/>',
    bow: '<path d="M20 8q44 24 0 48" fill="none" stroke="#ad7d4c" stroke-width="5"/><path d="m20 8 1 48M11 32h42m-8-6 9 6-9 6" fill="none" stroke="#87947a"/>',
    arrow: '<path d="m15 51 34-39" stroke="#aa8053" stroke-width="4"/><path d="m49 12-3 15-10-9z" fill="#8a9d92"/><path d="m17 37 1 12 12 1-7 8-13-1-1-13z" fill="#d2a47a"/><path d="m11 56 14-16"/>',
    needle: '<path d="m18 19-6 23q-4 17 21 17t21-17l-7-23" fill="#cf8b85"/><path d="M19 19q14 8 28 0l-2-8H21z" fill="#edc0a2"/><path d="M19 24h28m-14 0v28" stroke="#a46960"/><path d="m25 38 9-7 8 7-8 8z" fill="#e8c581"/><path d="M41 14 50 3" stroke="#929989"/>',
    ruler: '<path d="m8 44 40-33 12 15-40 33z" fill="#e0bd7c"/><path d="m18 37 5 6m2-12 5 6m2-12 5 6m2-12 5 6m2-12 5 6" stroke="#ac8956"/>',
    gavel: '<path d="m25 30 8 7-16 21-7-6z" fill="#9b714e"/><path d="m33 10 21 18-12 14-21-18z" fill="#b38a5d"/><path d="m28 16 20 18" stroke="#e1c28c" stroke-width="5"/><path d="M34 51h22v8H31v-4z" fill="#b38a5d"/>',
  };
  return `<svg class="item-art ${cls}" viewBox="0 0 68 68" aria-hidden="true" fill="none" stroke="#76684f" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${shapes[id] || ''}</svg>`;
}

export function baby(photo) {
  return `<svg class="baby-art" viewBox="0 0 260 235" role="img" aria-label="색동 한복을 입고 귀엽게 앉아 있는 아이">
  <ellipse cx="130" cy="218" rx="84" ry="10" fill="#d6d7bc" opacity=".4"/>
  <path d="M95 167q-44 16-39 40 17 21 59 4h32q42 17 59-4 5-24-39-40" fill="#9bab88"/>
  <path d="M92 127q-26 9-38 42l26 15 24-21m62-36q27 9 40 42l-26 15-24-21" fill="#e9c183"/>
  <path d="m67 147 24 14m-30-3 24 14m89-11 24-14m-19 25 25-14" stroke="#cf8d7d" stroke-width="9"/>
  <path d="M96 127h67l14 66q-44 15-94 0z" fill="#f6edda"/>
  <path d="m106 125 27 24 22-24" fill="#fff9e9" stroke="#d4c5a4" stroke-width="2"/>
  <path d="m128 146 29 29m-26-29-4 37m6-36q31-15 23 0-3 8-23 0" fill="none" stroke="#bd7b65" stroke-width="7"/>
  <ellipse cx="70" cy="178" rx="13" ry="10" fill="#f2cda8"/><ellipse cx="192" cy="178" rx="13" ry="10" fill="#f2cda8"/>
${photo ? `<image class="baby-real-face" href="${photo}" x="64" y="4" width="136" height="137" preserveAspectRatio="xMidYMax meet"/>` : `  <circle cx="72" cy="84" r="12" fill="#f1ccac"/><circle cx="188" cy="84" r="12" fill="#f1ccac"/>
  <path d="M74 70q0-54 57-54t56 54v29q-2 40-56 40T74 99z" fill="#f8dbb9"/>
  <path d="M74 72q-5-61 57-61 64 0 57 62-9-23-25-32-29 14-65 5z" fill="#534b3f"/>
  <path d="M123 28q-15 22 13 24" fill="none" stroke="#534b3f" stroke-width="9" stroke-linecap="round"/>
  <path d="M98 83q5-7 10 0m46 0q5-7 10 0" fill="none" stroke="#534b3f" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="94" cy="100" rx="12" ry="7" fill="#eeb0a0" opacity=".65"/><ellipse cx="168" cy="100" rx="12" ry="7" fill="#eeb0a0" opacity=".65"/>
  <path d="M119 103q12 16 24 0" fill="#bc7466"/><path d="M123 106h16" stroke="#fff5df" stroke-width="3"/>
  <path d="M101 18q29-12 59 0l-3 11q-26-9-53 0z" fill="#a5b394"/><circle cx="132" cy="20" r="8" fill="#ead39a"/>
`}
  </svg>`;
}

export function character(person, photo, small = false) {
  return `<div class="character ${small ? 'small' : ''}" style="--delay:-${Number(person.id.slice(1)) * .27}s;--shirt:${['#9ba987','#d39d8c','#b6abd0','#d1b572','#85aeb0'][Number(person.id.slice(1)) % 5]}"><div class="char-pose"><div class="char-head ${photo && (photo.includes('.webp') || photo.startsWith('data:image/webp;')) ? 'cutout-face' : ''}">${photo ? `<img src="${photo}" alt="${person.name}">` : `<span class="char-hair"></span><span class="char-eyes">• •</span><span class="char-smile"></span>`}</div><svg class="char-body" viewBox="0 0 50 52" aria-hidden="true" fill="none" stroke="#667264" stroke-width="4" stroke-linecap="round"><path d="M25 4v25"/><path class="leg-left" d="M25 29 13 47"/><path class="leg-right" d="M25 29 37 47"/><path class="arm-left" d="M25 11 9 23"/><path class="arm-right" d="M25 11 41 23"/><path class="wave-arm wave-upper" d="M25 11 64 5"/><path class="wave-arm wave-hand" d="M64 5 71 -15"/><path class="buddy-arm buddy-arm-left" d="M25 11 5 4-9 9"/><path class="buddy-arm buddy-arm-right" d="M25 11 45 4 59 9"/><path d="M25 5v19" stroke="var(--shirt)" stroke-width="10"/></svg></div><span class="char-name">${person.name}</span></div>`;
}
