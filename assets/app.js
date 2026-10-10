/* ระบบงานบุคลากร — Frontend (Vanilla JS, ไม่ต้อง build) */
(() => {
  'use strict';
  const CFG = Object.assign({ FIREBASE: null, ORG_NAME: 'หน่วยงาน', APP_TITLE: 'ระบบงานบุคลากร', LOGO: 'logo.png', CREDIT: '' }, window.APP_CONFIG || {});
  const loginLogo = () => CFG.LOGO ? `<img class="login-logo" src="${esc(CFG.LOGO)}" alt="โลโก้ ${esc(CFG.ORG_NAME)}" onerror="this.remove()">` : '';
  const loginCredit = () => CFG.CREDIT ? `<p class="login-credit">${esc(CFG.CREDIT)}</p>` : '';
  const FB = !!(CFG.FIREBASE && CFG.FIREBASE.apiKey && CFG.FIREBASE.projectId);
  const DEMO = !FB;
  const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const app = document.getElementById('app');
  // iPhone/iPad (Safari, LINE ฯลฯ) จะซูมหน้าเว็บเองเมื่อแตะช่องกรอก แล้วไม่ซูมกลับ
  // กำหนด maximum-scale=1 เฉพาะ iOS เพื่อปิดการซูมอัตโนมัติ (ผู้ใช้ยังใช้สองนิ้วขยายเองได้)
  (() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const m = document.querySelector('meta[name=viewport]');
    if (ios && m) m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  })();

  /* ---------------- utils ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const TH_M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const TH_MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const DEV_TYPES = ['ศึกษาดูงาน', 'อบรม', 'ประชุม/สัมมนา', 'อบรมออนไลน์', 'พัฒนาตนเองอื่น ๆ'];
  const AWARD_LEVELS = ['ระดับอำเภอ', 'ระดับจังหวัด', 'ระดับภาค', 'ระดับประเทศ', 'ระดับนานาชาติ'];
  // รายการ 3 ประเภท ใช้หน้าจอ/ฟอร์ม/รายงานชุดเดียวกัน ต่างกันที่ชื่อช่องและเมนู
  const KIND = {
    dev: {
      tab: 'dev', adminTab: 'records', menu: 'การพัฒนาตนเอง', mine: 'การพัฒนาตนเองของฉัน', adminMenu: 'รายการพัฒนาตนเอง', name: 'รายการพัฒนาตนเอง',
      head: 'การพัฒนาตนเอง', desc: 'ศึกษาดูงาน อบรม ประชุมสัมมนา และการพัฒนาตนเองตามโครงการพัฒนาบุคลากร', add: '+ เพิ่มรายการพัฒนาตนเอง', addTitle: 'เพิ่มรายการพัฒนาตนเอง', editTitle: 'แก้ไขรายการพัฒนาตนเอง',
      adminHead: 'รายการพัฒนาตนเองของบุคลากร', types: DEV_TYPES, typeLabel: 'ประเภทการพัฒนา', typeFallback: 'พัฒนาตนเอง',
      titleLabel: 'ชื่อเรื่อง / หลักสูตร / กิจกรรม', titlePh: 'เช่น ศึกษาดูงานแหล่งเรียนรู้เศรษฐกิจพอเพียง', placeLabel: 'สถานที่', orgLabel: 'หน่วยงานผู้จัด', orgShort: 'จัดโดย',
      detailLabel: 'ความรู้ที่ได้รับ / การนำไปใช้', detailShort: 'ความรู้ที่ได้รับ', detailPh: 'สรุปความรู้ ทักษะ หรือแนวคิดที่ได้รับ และการนำไปประยุกต์ใช้ในการปฏิบัติงาน', detailReq: true,
      project: true, hours: true, range: true, dateLabel: 'วันที่เริ่ม (วัน เดือน พ.ศ.)',
      empty: 'กด “เพิ่มรายการพัฒนาตนเอง” เพื่อบันทึกการศึกษาดูงานหรือการพัฒนาตนเอง',
      report: 'รายงานการพัฒนาตนเอง', reportAll: 'รายงานการพัฒนาตนเองของบุคลากร', file: 'การพัฒนาตนเอง'
    },
    award: {
      tab: 'award', adminTab: 'awards', menu: 'โล่/รางวัล', mine: 'โล่/รางวัลของฉัน', adminMenu: 'โล่/รางวัล', name: 'รายการโล่/รางวัล',
      head: 'โล่/รางวัล', desc: 'โล่ ถ้วย เกียรติบัตร และรางวัลที่ได้รับจากการปฏิบัติงาน', add: '+ เพิ่มรางวัล', addTitle: 'เพิ่มรายการโล่/รางวัล', editTitle: 'แก้ไขรายการโล่/รางวัล',
      adminHead: 'โล่/รางวัลของบุคลากร', types: ['โล่รางวัล', 'ถ้วยรางวัล', 'เกียรติบัตร', 'เหรียญรางวัล', 'รางวัลอื่น ๆ'], typeLabel: 'ประเภทรางวัล', typeFallback: 'รางวัล',
      titleLabel: 'ชื่อรางวัล / ผลงานที่ได้รับรางวัล', titlePh: 'เช่น ครูดีเด่น ระดับจังหวัด ประจำปี 2570', placeLabel: 'สถานที่รับรางวัล', orgLabel: 'หน่วยงานที่มอบรางวัล', orgShort: 'มอบโดย',
      detailLabel: 'รายละเอียดผลงาน / ความสำคัญของรางวัล', detailShort: 'รายละเอียด', detailPh: 'ผลงานที่ได้รับรางวัล เกณฑ์การคัดเลือก หรือประโยชน์ที่เกิดกับหน่วยงาน', detailReq: false,
      level: true, dateLabel: 'วันที่ได้รับรางวัล (วัน เดือน พ.ศ.)',
      empty: 'กด “เพิ่มรางวัล” เพื่อบันทึกโล่ ถ้วย เกียรติบัตร หรือรางวัลที่ได้รับ',
      report: 'รายงานโล่/รางวัล', reportAll: 'รายงานโล่/รางวัลของบุคลากร', file: 'โล่รางวัล'
    },
    speaker: {
      tab: 'speaker', adminTab: 'speakers', menu: 'เป็นวิทยากร', mine: 'การเป็นวิทยากรของฉัน', adminMenu: 'เป็นวิทยากร', name: 'รายการวิทยากร',
      head: 'การเป็นวิทยากร', desc: 'การได้รับเชิญเป็นวิทยากร บรรยาย อบรม หรือเป็นคณะกรรมการ', add: '+ เพิ่มงานวิทยากร', addTitle: 'เพิ่มรายการวิทยากร', editTitle: 'แก้ไขรายการวิทยากร',
      adminHead: 'การเป็นวิทยากรของบุคลากร', types: ['บรรยาย', 'วิทยากรอบรม/สาธิต', 'วิทยากรกระบวนการ', 'คณะกรรมการตัดสิน/ประเมิน', 'วิทยากรอื่น ๆ'], typeLabel: 'ลักษณะงาน', typeFallback: 'วิทยากร',
      titleLabel: 'หัวข้อ / เรื่องที่เป็นวิทยากร', titlePh: 'เช่น การทำบัญชีครัวเรือน', placeLabel: 'สถานที่', orgLabel: 'หน่วยงานที่เชิญ', orgShort: 'เชิญโดย',
      detailLabel: 'รายละเอียด / ผลที่เกิดขึ้น', detailShort: 'รายละเอียด', detailPh: 'เนื้อหาที่ถ่ายทอด กิจกรรม และผลที่เกิดกับผู้เข้าร่วม', detailReq: false,
      audience: true, hours: true, range: true, dateLabel: 'วันที่ (วัน เดือน พ.ศ.)',
      empty: 'กด “เพิ่มงานวิทยากร” เพื่อบันทึกการเป็นวิทยากรหรือคณะกรรมการ',
      report: 'รายงานการเป็นวิทยากร', reportAll: 'รายงานการเป็นวิทยากรของบุคลากร', file: 'การเป็นวิทยากร'
    }
  };
  const KINDS = ['dev', 'award', 'speaker'];
  const kindOf = r => KIND[r && r.kind] ? r.kind : 'dev';
  const ofKind = (list, k) => list.filter(r => kindOf(r) === k);
  const noPending = () => ({ dev: 0, award: 0, speaker: 0 });
  const countPending = (list, myId) => { const n = noPending(); list.forEach(r => { if (!r.review && r.staffId !== myId) n[kindOf(r)]++; }); return n; };
  const sumPending = n => KINDS.reduce((a, k) => a + (n[k] || 0), 0);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { } }
  };
  const fullName = u => [u.prefix, u.firstName].filter(Boolean).join('') + (u.lastName ? ' ' + u.lastName : '');
  const parseISO = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  const thDate = (iso, short) => { const p = parseISO(iso); if (!p) return ''; return `${p.d} ${(short ? TH_MS : TH_M)[p.m - 1]} ${p.y + 543}`; };
  const thRange = (a, b) => {
    if (!b || a === b) return thDate(a);
    const p = parseISO(a), q = parseISO(b);
    if (p && q && p.y === q.y && p.m === q.m) return `${p.d}–${q.d} ${TH_M[p.m - 1]} ${p.y + 543}`;
    return `${thDate(a, true)} – ${thDate(b, true)}`;
  };
  const curFY = () => { const d = new Date(); return String(d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0)); };
  const fyRange = y => `1 ต.ค. ${+y - 1} – 30 ก.ย. ${y}`;
  const money = v => { const n = Number(String(v).replace(/,/g, '')); return v !== '' && !isNaN(n) ? n.toLocaleString('th-TH') + ' บาท' : v; };
  const age = u => { const y = Number(u.birthYear); if (!y) return ''; const d = new Date(); let a = d.getFullYear() + 543 - y; const m = Number(u.birthMonth), dd = Number(u.birthDay); if (m && (d.getMonth() + 1 < m || (d.getMonth() + 1 === m && d.getDate() < dd))) a--; return a; };
  const birthText = u => { const y = u.birthYear; if (!y) return ''; const m = Number(u.birthMonth); return [u.birthDay, m ? TH_M[m - 1] : '', y].filter(Boolean).join(' ') + (age(u) ? ` (อายุ ${age(u)} ปี)` : ''); };
  const PHOTO = {}; // ภาพจาก Firestore: key "fs:<recordId>:<n>" → data URL
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const photoUrl = id => !id ? '' : /^fs:/.test(id) ? (PHOTO[id] || '') : id;
  const sumHours = rs => rs.reduce((a, r) => a + (Number(r.hours) || 0), 0);

  /* ---------------- state ---------------- */
  const S = { token: store.get('hr_token'), role: null, user: null, meta: { years: [], projects: [] }, tab: null, fy: null, cache: {} };

  /* ---------------- API ---------------- */
  let backendP = null;
  function backend() {
    if (!backendP) backendP = FB ? import('./firebase-api.js').then(m => m.create(CFG)) : Promise.resolve(Demo);
    return backendP;
  }
  const lstore = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  async function api(action, payload = {}) {
    const body = Object.assign({ action, token: S.token }, payload);
    let res;
    try { res = await (await backend()).handle(DEMO ? JSON.parse(JSON.stringify(body)) : body); }
    catch (e) { throw new Error('เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ตหรือการตั้งค่า FIREBASE ใน config.js'); }
    if (!res.ok) {
      if (res.error === 'SESSION') { logout(true); throw new Error('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'); }
      throw new Error(res.error || 'เกิดข้อผิดพลาด');
    }
    return res.data;
  }

  let busyN = 0;
  async function busy(fn) {
    busyN++; let el = $('.loading');
    if (!el) { el = document.createElement('div'); el.className = 'loading'; el.innerHTML = '<div class="spinner" role="status" aria-label="กำลังโหลด"></div>'; document.body.appendChild(el); }
    try { return await fn(); }
    catch (e) { toast(e.message, true); throw e; }
    finally { if (--busyN <= 0) { busyN = 0; el.remove(); } }
  }

  /* ปุ่มรูปตา แสดง/ซ่อนรหัสผ่าน — ใส่ให้ทุกช่องรหัสผ่านอัตโนมัติ */
  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.4 18.4 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  function enhancePasswords(root) {
    $$('input[type=password]:not([data-eye])', root).forEach(inp => {
      inp.dataset.eye = '1';
      const wrap = document.createElement('span'); wrap.className = 'pw-wrap';
      inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pw-eye'; b.innerHTML = EYE; b.setAttribute('aria-label', 'แสดงรหัสผ่าน'); b.title = 'แสดงรหัสผ่าน';
      b.onclick = () => {
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.innerHTML = show ? EYE_OFF : EYE;
        b.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'); b.title = b.getAttribute('aria-label');
        inp.focus();
      };
      wrap.appendChild(b);
    });
  }
  new MutationObserver(() => enhancePasswords(document)).observe(document.body, { childList: true, subtree: true });

  function toast(msg, err) {
    $$('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(() => t.remove(), err ? 5000 : 2600);
  }

  /* ---------------- modal ---------------- */
  function modal({ title, body, foot = '', size = '' }) {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h2>${esc(title)}</h2><button class="btn ghost sm" data-close aria-label="ปิด">✕</button></div>
      <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    return { el: back, close };
  }
  function confirmBox(text, okLabel = 'ยืนยัน', danger = true) {
    return new Promise(res => {
      const m = modal({ title: 'ยืนยันการทำรายการ', size: 'sm', body: `<p style="margin:0">${esc(text)}</p>`, foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(okLabel)}</button>` });
      let done = false;
      $('#cf-ok', m.el).onclick = () => { done = true; m.close(); res(true); };
      new MutationObserver((_, o) => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true });
    });
  }
  function lightbox(src, caption) {
    modal({ title: caption || 'รูปภาพหลักฐาน', body: `<div class="lightbox"><img src="${esc(src)}" alt="${esc(caption || 'รูปภาพหลักฐาน')}"></div>` });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('img.thumb[data-full]');
    if (t && t.dataset.full) lightbox(t.dataset.full, t.alt);
  });

  /* ---------------- auth ---------------- */
  function renderLogin(msg) {
    document.title = `${CFG.APP_TITLE} | ${CFG.ORG_NAME}`;
    app.innerHTML = `${DEMO ? demoBar() : ''}
    <div class="login-wrap"><div class="login-stack">${loginLogo()}<form class="login-card" id="login-form" autocomplete="on">
      <div class="login-head"><div class="eyebrow">${esc(CFG.ORG_NAME)}</div><h1>${esc(CFG.APP_TITLE)}</h1></div>
      <div class="login-body">
        <label class="field"><span>ชื่อผู้ใช้ (ชื่อจริง ไม่ต้องมีคำนำหน้าและนามสกุล)</span>
          <input type="text" id="lg-user" name="username" required autocomplete="username" placeholder="เช่น สมชาย"></label>
        <label class="field"><span>รหัสผ่าน</span>
          <input type="password" id="lg-pass" name="password" required autocomplete="current-password" placeholder="ครั้งแรกใช้เบอร์โทรศัพท์"></label>
        ${msg ? `<div class="chip bad" style="white-space:normal">${esc(msg)}</div>` : ''}
        <button class="btn primary" type="submit">เข้าสู่ระบบ</button>
        <button class="btn ghost sm" type="button" id="lg-forgot" style="align-self:center">ลืมรหัสผ่าน?</button>
        <div class="hint">เข้าสู่ระบบครั้งแรกใช้ <b>เบอร์โทรศัพท์</b> เป็นรหัสผ่าน (ตัวเลข 10 หลัก) หลังจากนั้นเปลี่ยนรหัสผ่านได้ 1 ครั้งที่เมนู “เปลี่ยนรหัสผ่าน” ถ้าลืมรหัสผ่าน ระบบจะส่งลิงก์ตั้งรหัสใหม่ไปที่อีเมลของคุณ
        ${DEMO ? `<br><br><b>บัญชีทดลอง</b> ครู: สมชาย / 0811111111 · ผอ.: admin / admin1234` : ''}</div>
      </div></form>${loginCredit()}</div></div>`;
    $('#lg-forgot').onclick = () => forgotPassword($('#lg-user').value);
    $('#login-form').onsubmit = async e => {
      e.preventDefault();
      try {
        const d = await busy(() => api('login', { username: $('#lg-user').value, password: $('#lg-pass').value }));
        S.token = d.token; store.set('hr_token', d.token);
        await enter(d);
      } catch (err) { /* toast shown */ }
    };
  }

  function forgotPassword(name) {
    const m = modal({
      title: 'ลืมรหัสผ่าน', size: 'sm',
      body: `<p style="margin:0">กรอกชื่อผู้ใช้ (ชื่อจริง) ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลที่ลงทะเบียนไว้</p>
        <label class="field"><span>ชื่อผู้ใช้</span><input type="text" id="fg-user" value="${esc(name || '')}"></label>`,
      foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn primary" id="fg-ok">ส่งลิงก์</button>`
    });
    $('#fg-ok', m.el).onclick = async () => {
      try {
        const d = await busy(() => api('forgotPassword', { username: $('#fg-user', m.el).value }));
        m.close();
        modal({ title: 'ส่งลิงก์แล้ว', size: 'sm', body: `<p style="margin:0">ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ <b>${esc(d.sentTo)}</b> แล้ว กรุณาเปิดอีเมล (ถ้าไม่พบ ให้ดูในโฟลเดอร์จดหมายขยะ) ตั้งรหัสใหม่ แล้วกลับมาเข้าสู่ระบบ</p>`, foot: '<button class="btn primary" data-close>ตกลง</button>' });
      } catch (e) { }
    };
  }

  function renderSetup() {
    document.title = `ติดตั้งระบบ | ${CFG.APP_TITLE}`;
    app.innerHTML = `<div class="login-wrap"><div class="login-stack">${loginLogo()}<form class="login-card" id="setup-form">
      <div class="login-head"><div class="eyebrow">${esc(CFG.ORG_NAME)} · ติดตั้งครั้งแรก</div><h1>สร้างบัญชีผู้ดูแลระบบ</h1></div>
      <div class="login-body">
        <div class="hint">ทำครั้งเดียวหลังเชื่อมต่อ Firebase เสร็จ บัญชีนี้ใช้ชื่อผู้ใช้ <b>admin</b> และใช้อีเมลนี้สำหรับรีเซ็ตรหัสผ่าน</div>
        <label class="field"><span>อีเมลของผู้ดูแลระบบ</span><input type="email" id="su-email" required autocomplete="email"></label>
        <label class="field"><span>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</span><input type="password" id="su-pass" required minlength="6" autocomplete="new-password"></label>
        <label class="field"><span>ยืนยันรหัสผ่าน</span><input type="password" id="su-pass2" required minlength="6" autocomplete="new-password"></label>
        <button class="btn primary" type="submit">สร้างบัญชีและเริ่มใช้งาน</button>
      </div></form>${loginCredit()}</div></div>`;
    $('#setup-form').onsubmit = async e => {
      e.preventDefault();
      if ($('#su-pass').value !== $('#su-pass2').value) return toast('รหัสผ่านทั้งสองช่องไม่ตรงกัน', true);
      try {
        const d = await busy(() => api('setupAdmin', { email: $('#su-email').value, password: $('#su-pass').value }));
        S.token = 'firebase'; store.set('hr_token', S.token); lstore.set('hr_setup_done', '1');
        await enter(d); S.tab = 'settings'; render();
        toast('ติดตั้งเรียบร้อย ขั้นต่อไป: นำเข้าข้อมูลบุคลากร');
      } catch (e) { }
    };
  }

  async function enter(d) {
    S.role = d.role; S.user = d.user; S.cache = {}; S.authUid = d.uid || null;
    S.meta = d.meta || await api('meta');
    S.fy = S.meta.years.includes(curFY()) ? curFY() : (S.meta.years[0] || curFY());
    S.tab = store.get('hr_tab_' + S.role) || (S.role === 'admin' ? 'overview' : 'profile');
    S.pending = noPending();
    render();
    startPendingWatch();
  }

  // ฟังการเปลี่ยนแปลงจากฐานข้อมูล: ครูส่งรายการใหม่ ตัวเลขเพิ่มทันที / ตรวจแล้ว ตัวเลขลดทันที
  let stopWatch = null;
  function stopPendingWatch() {
    if (stopWatch) { stopWatch(); stopWatch = null; }
    if (userWatch) { userWatch(); userWatch = null; }
    clearInterval(pollT); pollT = null; liveOk = false;
  }
  let liveOk = false, pollT = null, userWatch = null;
  async function startPendingWatch() {
    stopPendingWatch();
    const be = await backend();
    // บัญชีในเบราว์เซอร์นี้ถูกเปลี่ยนจากแท็บอื่น → โหลดหน้าใหม่ให้ตรงกับบัญชีปัจจุบัน
    if (be.onUserChange && S.authUid) {
      const myUid = S.authUid;
      userWatch = be.onUserChange(uid => {
        if (!S.user || uid === myUid) return;
        stopPendingWatch();
        modal({ title: 'บัญชีผู้ใช้เปลี่ยน', size: 'sm', body: '<p style="margin:0">มีการเข้าสู่ระบบหรือออกจากระบบด้วยบัญชีอื่นในแท็บอื่นของเบราว์เซอร์นี้ หน้านี้จะโหลดใหม่ตามบัญชีปัจจุบัน<br><br><span class="small muted">ถ้าต้องการใช้ 2 บัญชีพร้อมกัน ให้ใช้คนละเบราว์เซอร์ หรือหน้าต่างไม่ระบุตัวตน (Incognito)</span></p>', foot: '<button class="btn primary" onclick="location.reload()">ตกลง</button>' });
      });
    }
    if (S.role !== 'admin') return;
    if (!be.watchPending) return refreshPending();
    let first = true;
    stopWatch = be.watchPending(n => {
      if (typeof n === 'number') n = Object.assign(noPending(), { dev: n });
      const prev = S.pending;
      S.pending = n; paintBadge();
      if (!first) notifyNew(prev, n);
      if (!first) scheduleLiveRefresh();
      first = false;
    }, ok => { liveOk = ok; });
    // สำรอง: ถ้าการเชื่อมต่อเรียลไทม์ใช้ไม่ได้ ตรวจข้อมูลใหม่ทุก 1 นาที (เฉพาะตอนเปิดหน้านี้อยู่)
    pollT = setInterval(() => { if (!liveOk && document.visibilityState === 'visible') liveCatchUp(); }, 60000);
  }
  // ดึงข้อมูลล่าสุดหนึ่งครั้ง (ใช้ตอนกลับมาที่แท็บ หรือเมื่อการเชื่อมต่อเรียลไทม์ใช้ไม่ได้)
  async function liveCatchUp() {
    if (S.role !== 'admin') return;
    try {
      const all = await api('listRecords', {});
      const n = countPending(all, S.user.id);
      notifyNew(S.pending, n);
      S.pending = n; paintBadge();
    } catch (e) { return; }
    scheduleLiveRefresh();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.user) liveCatchUp(); });
  function notifyNew(prev, n) {
    const up = KINDS.filter(k => (n[k] || 0) > ((prev || {})[k] || 0));
    if (up.length) toast(`มีรายการใหม่รอตรวจ: ${up.map(k => `${KIND[k].adminMenu} ${n[k]} รายการ`).join(' · ')}`);
  }
  // ถ้าเปิดหน้า "รายการพัฒนาตนเอง" อยู่ ให้รายการในหน้าอัปเดตเองเมื่อข้อมูลเปลี่ยน
  let liveT = null;
  function scheduleLiveRefresh() {
    clearTimeout(liveT);
    liveT = setTimeout(() => { if (KINDS.some(k => KIND[k].adminTab === S.tab) && typeof S.recLive === 'function') S.recLive(); }, 400);
  }

  /* ตัวเลขแจ้งเตือนบนเมนู "รายการพัฒนาตนเอง": จำนวนรายการที่รอผู้บริหารตรวจ (ทุกปีงบประมาณ ไม่นับรายการของตนเอง) */
  async function refreshPending() {
    if (S.role !== 'admin' || stopWatch) return; // ถ้าติดตามแบบเรียลไทม์อยู่แล้ว ไม่ต้องโหลดซ้ำ
    try {
      const all = await api('listRecords', {});
      S.pending = countPending(all, S.user.id);
    } catch (e) { return; }
    paintBadge();
  }
  function paintBadge() {
    KINDS.forEach(k => {
      const t = $(`.tab[data-tab=${KIND[k].adminTab}]`); if (!t) return;
      const n = (S.pending || {})[k] || 0;
      let b = $('.tab-badge', t);
      if (!n) { if (b) b.remove(); t.removeAttribute('title'); return; }
      if (!b) { b = document.createElement('span'); b.className = 'tab-badge'; t.appendChild(b); }
      b.textContent = n > 99 ? '99+' : String(n);
      t.title = `รอตรวจ ${n} รายการ`;
      b.setAttribute('aria-label', `รอตรวจ ${n} รายการ`);
    });
  }

  async function logout(silent) {
    const wasIn = !!S.user;
    stopPendingWatch();
    if (!silent && S.token) { try { await busy(() => api('logout')); } catch (e) { } }
    S.token = null; S.user = null; S.role = null; store.set('hr_token', null);
    renderLogin(silent && wasIn ? 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่' : '');
  }

  /* ---------------- shell ---------------- */
  const TABS = {
    teacher: [['profile', 'ประวัติส่วนตัว'], ...KINDS.map(k => [KIND[k].tab, KIND[k].menu]), ['password', 'เปลี่ยนรหัสผ่าน']],
    admin: [['overview', 'ภาพรวม'], ['staff', 'ข้อมูลบุคลากร'], ...KINDS.map(k => [KIND[k].adminTab, KIND[k].adminMenu]), ['settings', 'ตั้งค่าปีงบ/โครงการ'], ['password', 'เปลี่ยนรหัสผ่าน']]
  };
  function demoBar() { return `<div class="demo-bar">โหมดทดลอง: ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ใส่ค่า FIREBASE ใน config.js เพื่อใช้งานจริง</div>`; }

  // เมนูหลายแถวบนจอเล็ก (ผู้บริหารมีเมนูมาก): ถ้าแถบเมนูสูงเกินไป ไม่ตรึงไว้ด้านบน เพื่อไม่ให้บังเนื้อหา
  function fitAppbar() { const ab = $('.appbar'); if (ab) ab.classList.toggle('tall', ab.offsetHeight > window.innerHeight * 0.36); }
  window.addEventListener('resize', () => fitAppbar());
  function render() {
    let tabs = TABS[S.role];
    if (S.role === 'admin' && !S.user.isAdminAccount) tabs = tabs.slice(0, 2 + KINDS.length + 1).concat([['profile', 'ประวัติส่วนตัวของฉัน'], ...KINDS.map(k => [KIND[k].tab, KIND[k].mine]), ['password', 'เปลี่ยนรหัสผ่าน']]);
    if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];
    document.title = `${CFG.APP_TITLE} | ${CFG.ORG_NAME}`;
    app.innerHTML = `${DEMO ? demoBar() : ''}
    <div class="appbar"><header class="topbar"><div class="topbar-in">
      <div class="brand"><b>${esc(CFG.APP_TITLE)}</b><small>${esc(CFG.ORG_NAME)}${S.role === 'admin' ? ' · ผู้บริหาร' : ''}</small></div>
      <div class="who"><span class="name">${esc(fullName(S.user))}</span><button class="btn sm" id="btn-logout">ออกจากระบบ</button></div>
    </div></header>
    <nav class="tabs" aria-label="เมนู"><div class="tabs-in">${tabs.map(([k, l]) => `<button class="tab ${k === S.tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div></nav></div>
    <main id="view"></main>`;
    $('#btn-logout').onclick = () => logout();
    fitAppbar();
    paintBadge();
    $$('.tab').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; store.set('hr_tab_' + S.role, S.tab); render(); });
    const v = $('#view');
    const views = { profile: viewProfile, password: viewPassword, overview: viewOverview, staff: viewStaff, settings: viewSettings };
    KINDS.forEach(k => { views[KIND[k].tab] = el => viewKind(el, k); views[KIND[k].adminTab] = el => viewRecords(el, k); });
    (views[S.tab] || viewProfile)(v);
  }

  /* ---------------- profile ---------------- */
  const GROUPS = [
    { t: 'ข้อมูลทั่วไป', f: [['prefix', 'คำนำหน้า'], ['firstName', 'ชื่อ', { lock: 1 }], ['lastName', 'นามสกุล', { lock: 1 }], ['position', 'ตำแหน่ง', { lock: 1 }], ['citizenId', 'เลขประจำตัวประชาชน', { lock: 1 }], ['birth', 'วันเดือนปีเกิด', { type: 'birth' }], ['phone', 'เบอร์โทรศัพท์', { type: 'tel' }], ['email', 'อีเมล', { type: 'email' }], ['address', 'ที่อยู่', { type: 'textarea', wide: 1 }]] },
    { t: 'การศึกษา', f: [['education', 'วุฒิการศึกษา'], ['major', 'วิชาเอก']] },
    { t: 'ลูกเสือและยุวกาชาด', f: [['scoutQual', 'วุฒิทางลูกเสือ'], ['scoutType', 'ประเภทลูกเสือ'], ['scoutPosition', 'ตำแหน่งทางลูกเสือ'], ['scoutFee', 'การจ่ายค่าธรรมเนียมลูกเสือ'], ['redCrossQual', 'วุฒิทางยุวกาชาด', { wide: 1 }], ['redCrossDate', 'วันที่ผ่านการอบรมวิทยากรยุวกาชาด']] },
    { t: 'เงินเดือนและเครื่องราชอิสริยาภรณ์', f: [['salary', 'เงินเดือน', { lock: 1, type: 'money' }], ['insignia', 'เครื่องราชอิสริยาภรณ์']] }
  ];
  const ADMIN_ONLY = [['role', 'สิทธิ์การใช้งาน', { type: 'role' }]];

  function profileHTML(u) {
    const val = (k, o = {}) => {
      let v = k === 'birth' ? birthText(u) : u[k];
      if (o.type === 'money' && v) v = money(v);
      return v ? `<dd>${esc(v)}</dd>` : `<dd class="empty">—</dd>`;
    };
    return GROUPS.map(g => `<section class="panel"><h3>${g.t}</h3><dl class="dl">${g.f.map(([k, l, o = {}]) => `<div class="${o.wide ? 'wide' : ''}"><dt>${l}</dt>${val(k, o)}</div>`).join('')}</dl></section>`).join('');
  }

  function viewProfile(v, u = S.user) {
    const initial = (u.firstName || '?').trim().charAt(0);
    v.innerHTML = `
      ${u.canChangePassword && !S.user.isAdminAccount ? `<div class="notice info no-print"><div class="grow">ขณะนี้รหัสผ่านของคุณคือ <b>เบอร์โทรศัพท์</b> เปลี่ยนเป็นรหัสผ่านของคุณเองได้ 1 ครั้ง</div><button class="btn sm" id="go-pw">เปลี่ยนรหัสผ่าน</button></div>` : ''}
      <div class="page-head"><div class="grow profile-hero"><div class="avatar" aria-hidden="true">${esc(initial)}</div>
        <div><h1>${esc(fullName(u))}</h1><div class="muted">${esc([u.position, u.education && 'วุฒิ ' + u.education, u.major].filter(Boolean).join(' · ') || 'บุคลากร')}</div></div></div>
        <div class="actions no-print"><button class="btn" id="pdf-me">ดาวน์โหลด PDF</button><button class="btn primary" id="edit-me">แก้ไขข้อมูล</button></div></div>
      ${profileHTML(u)}
`;
    $('#pdf-me').onclick = () => reportPerson(u, null, { profile: true });
    $('#edit-me').onclick = () => editProfile(u, false, nu => { S.user = Object.assign(S.user, nu); render(); });
    const gp = $('#go-pw'); if (gp) gp.onclick = () => { S.tab = 'password'; render(); };
  }

  function editProfile(u, asAdmin, onSaved) {
    const isNew = !u.id;
    const input = (k, l, o = {}) => {
      const locked = false; // ครูแก้ไขข้อมูลของตนเองได้ทุกช่อง (ยกเว้นสิทธิ์การใช้งาน ซึ่งแสดงเฉพาะผู้ดูแล)
      const val = esc(u[k] ?? '');
      let ctl;
      if (o.type === 'birth') {
        ctl = `<div class="date3"><select id="pf-birthDay" aria-label="วัน"><option value="">วัน</option>${range(1, 31).map(d => `<option ${String(u.birthDay) === String(d) ? 'selected' : ''}>${d}</option>`).join('')}</select>
          <select id="pf-birthMonth" aria-label="เดือน"><option value="">เดือน</option>${TH_M.map((m, i) => `<option value="${i + 1}" ${Number(u.birthMonth) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <input type="number" id="pf-birthYear" aria-label="ปี พ.ศ." placeholder="พ.ศ." min="2470" max="2600" value="${esc(u.birthYear || '')}"></div>`;
      } else if (o.type === 'textarea') ctl = `<textarea id="pf-${k}" rows="2" ${locked ? 'disabled' : ''}>${val}</textarea>`;
      else if (o.type === 'role') ctl = `<select id="pf-${k}"><option value="">ครู/บุคลากร</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้บริหาร (เห็นข้อมูลทุกคน)</option></select>`;
      else ctl = `<input type="${o.type === 'tel' ? 'tel' : o.type === 'email' ? 'email' : 'text'}" id="pf-${k}" value="${val}" ${locked ? 'disabled' : ''}>`;
      return `<label class="field ${o.wide ? 'wide' : ''}"><span>${l}${locked ? ' (แก้ไขโดยผู้ดูแล)' : ''}${k === 'firstName' ? ' <span class="req">* ใช้เป็นชื่อผู้ใช้เข้าระบบ</span>' : ''}</span>${ctl}</label>`;
    };
    const groups = asAdmin ? GROUPS.concat([{ t: 'สิทธิ์', f: ADMIN_ONLY }]) : GROUPS;
    const m = modal({
      title: isNew ? 'เพิ่มบุคลากร' : 'แก้ไขข้อมูล: ' + fullName(u),
      body: groups.map(g => `<fieldset style="border:0;padding:0;margin:0"><h3 style="margin-bottom:.6rem">${g.t}</h3><div class="grid">${g.f.map(f => input(...f)).join('')}</div></fieldset>`).join(''),
      foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn primary" id="pf-save">บันทึก</button>`
    });
    $('#pf-save', m.el).onclick = async () => {
      const data = isNew ? {} : { id: u.id };
      groups.forEach(g => g.f.forEach(([k, , o = {}]) => {
        if (o.type === 'birth') { ['birthDay', 'birthMonth', 'birthYear'].forEach(b => data[b] = $('#pf-' + b, m.el).value); return; }
        const el = $('#pf-' + k, m.el); if (el && !el.disabled) data[k] = el.value;
      }));
      if (!String(data.firstName || '').trim()) return toast('กรุณากรอกชื่อ', true);
      if (!isNew && !asAdmin && String(data.firstName).replace(/\s+/g, '') !== String(u.firstName || '').replace(/\s+/g, '')
        && !(await confirmBox(`ชื่อใช้เป็นชื่อผู้ใช้เข้าระบบ ถ้าเปลี่ยนเป็น “${String(data.firstName).trim()}” ครั้งต่อไปต้องเข้าระบบด้วยชื่อใหม่ (รหัสผ่านเดิม) ยืนยันหรือไม่?`, 'ยืนยันเปลี่ยนชื่อ', false))) return;
      try {
        const nu = await busy(() => api('updateProfile', { data }));
        m.close(); toast(nu && nu._warn ? nu._warn : 'บันทึกข้อมูลแล้ว', !!(nu && nu._warn)); S.cache = {}; onSaved && onSaved(nu);
      } catch (e) { }
    };
  }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  /* ---------------- password ---------------- */
  function viewPassword(v) {
    const u = S.user;
    if (!u.canChangePassword) {
      v.innerHTML = `<div class="page-head"><div class="grow"><h1>เปลี่ยนรหัสผ่าน</h1></div></div>
      <div class="panel"><p style="margin:0">คุณใช้สิทธิ์เปลี่ยนรหัสผ่านไปแล้ว (เปลี่ยนได้ 1 ครั้ง) หากลืมรหัสผ่านหรือต้องการเปลี่ยนอีก กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านกลับเป็นเบอร์โทรศัพท์</p></div>`;
      return;
    }
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>เปลี่ยนรหัสผ่าน</h1>
      <div class="muted">${u.isAdminAccount ? 'บัญชีผู้ดูแลระบบเปลี่ยนรหัสผ่านได้ทุกเมื่อ' : 'เปลี่ยนได้ <b>1 ครั้ง</b> เท่านั้น กรุณาจดจำรหัสผ่านใหม่ให้ดี'}</div></div></div>
      <form class="panel" id="pw-form" style="max-width:480px;display:flex;flex-direction:column;gap:1rem">
        <label class="field"><span>รหัสผ่านปัจจุบัน ${u.isAdminAccount ? '' : '(เบอร์โทรศัพท์)'}</span><input type="password" id="pw-old" required autocomplete="current-password"></label>
        <label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</span><input type="password" id="pw-new" required minlength="6" autocomplete="new-password"></label>
        <label class="field"><span>ยืนยันรหัสผ่านใหม่</span><input type="password" id="pw-new2" required minlength="6" autocomplete="new-password"></label>
        <div><button class="btn primary" type="submit">บันทึกรหัสผ่านใหม่</button></div>
      </form>`;
    $('#pw-form').onsubmit = async e => {
      e.preventDefault();
      const a = $('#pw-new').value, b = $('#pw-new2').value;
      if (a !== b) return toast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', true);
      if (!u.isAdminAccount && !(await confirmBox('เปลี่ยนรหัสผ่านได้เพียงครั้งเดียว ยืนยันใช้รหัสผ่านใหม่นี้หรือไม่?', 'ยืนยันเปลี่ยน', false))) return;
      try {
        const nu = await busy(() => api('changePassword', { oldPassword: $('#pw-old').value, newPassword: a }));
        if (nu && typeof nu === 'object') Object.assign(S.user, nu);
        toast('เปลี่ยนรหัสผ่านเรียบร้อย'); render();
      } catch (e) { }
    };
  }

  /* ---------------- dev records (teacher) ---------------- */
  const yearSelect = (id, val, extraAll) => `<select id="${id}">${extraAll ? '<option value="">ทุกปีงบประมาณ</option>' : ''}${S.meta.years.map(y => `<option value="${y}" ${y === val ? 'selected' : ''}>ปีงบประมาณ พ.ศ. ${y}</option>`).join('')}</select>`;

  const REVIEW = { approved: ['good', 'ตรวจแล้ว'], revise: ['bad', 'ส่งกลับแก้ไข'], '': ['warn', 'รอตรวจ'] };
  const reviewChip = r => { const [c, t] = REVIEW[r.review || ''] || REVIEW['']; return `<span class="chip ${c}">${t}</span>`; };
  const reviewBox = r => r.review ? `<div class="review-note ${esc(r.review)}"><b>${r.review === 'approved' ? 'ผลการตรวจ: ตรวจแล้ว' : 'ส่งกลับให้แก้ไข'}</b> <span class="muted small">โดย ${esc(r.reviewBy || '-')}${r.reviewAt ? ' · ' + esc(thDate(r.reviewAt, true)) : ''}</span>${r.reviewNote ? `<div>${esc(r.reviewNote)}</div>` : ''}</div>` : '';

  // mode: 'own' = เจ้าของ (แก้ไข/ลบ) · 'review' = ผู้บริหารตรวจ · 'view' = ดูอย่างเดียว
  function recCard(r, opts = {}) {
    const mode = opts.mode || 'own';
    const k = kindOf(r), K = KIND[k];
    const ph = ['photo1', 'photo2'].map((f, i) => r[f] ? `<img class="thumb" loading="lazy" src="${esc(photoUrl(r[f]) || BLANK)}" data-full="${esc(photoUrl(r[f]))}" ${/^fs:/.test(r[f]) ? `data-fs="${esc(r[f])}"` : ''} alt="รูปหลักฐาน ${i + 1}: ${esc(r.title)}">` : `<div class="thumb none">ไม่มีรูปที่ ${i + 1}</div>`).join('');
    const long = (r.knowledge || '').length > 260;
    const info = [
      K.project ? `<span><b class="lbl">โครงการ:</b> ${esc(r.projectName || '—')}</span>` : '',
      r.organizer ? `<span><b class="lbl">${K.orgShort}:</b> ${esc(r.organizer)}</span>` : '',
      r.place ? `<span><b class="lbl">${K.placeLabel}:</b> ${esc(r.place)}</span>` : '',
      K.audience && r.audience ? `<span><b class="lbl">ผู้เข้าร่วม:</b> ${esc(r.audience)}</span>` : ''
    ].join('');
    return `<article class="rec st-${esc(r.review || 'pending')}${opts.isNew ? ' rec-new' : ''}" data-id="${esc(r.id)}" data-who="${esc(opts.who || '')}">
      <div class="body">
        <div class="meta">${opts.isNew ? '<span class="chip new">ใหม่</span>' : ''}${reviewChip(r)}<span class="chip ink">${esc(r.type || K.typeFallback)}</span>${K.level && r.level ? `<span class="chip accent">${esc(r.level)}</span>` : ''}<span class="num">${esc(thRange(r.startDate, r.endDate))}</span>${K.hours && r.hours ? `<span class="num">${esc(r.hours)} ชั่วโมง</span>` : ''}</div>
        <h3>${esc(r.title)}</h3>
        ${opts.who ? `<div class="small"><b>${esc(opts.who)}</b></div>` : ''}
        ${info ? `<div class="meta">${info}</div>` : ''}
        ${K.detailReq || r.knowledge ? `<div class="small" style="margin-top:.2rem"><b class="lbl">${K.detailShort}</b></div>
        <div class="know ${long ? 'clamp' : ''}">${esc(r.knowledge || '—')}</div>` : ''}
        ${long ? `<button class="btn ghost sm no-print" data-more style="align-self:flex-start">อ่านทั้งหมด</button>` : ''}
        ${reviewBox(r)}
      </div>
      <div class="photos">${ph}</div>
      ${mode === 'own' ? `<div class="ops"><button class="btn sm" data-edit>แก้ไข</button><button class="btn sm danger" data-del>ลบ</button></div>`
        : mode === 'review' ? `<div class="ops"><button class="btn sm primary" data-review>${r.review ? 'เปลี่ยนผลการตรวจ' : 'ตรวจรายการนี้'}</button></div>` : ''}
    </article>`;
  }

  function reviewForm(r, who, reload) {
    const m = modal({
      title: 'ตรวจ' + KIND[kindOf(r)].name, size: 'sm',
      body: `<div><b>${esc(who || '')}</b><div>${esc(r.title)}</div><div class="small muted">${esc(thRange(r.startDate, r.endDate))} · สถานะปัจจุบัน ${reviewChip(r)}</div></div>
        <label class="field"><span>ความเห็น / สิ่งที่ต้องแก้ไข (จำเป็นเมื่อส่งกลับแก้ไข)</span><textarea id="rv-note" rows="4" placeholder="เช่น กรุณาเพิ่มรายละเอียด หรือแนบรูปให้ครบ 2 รูป">${esc(r.reviewNote || '')}</textarea></label>`,
      foot: `${r.review ? '<button class="btn ghost" id="rv-clear">ยกเลิกผลตรวจ</button>' : ''}<button class="btn danger" id="rv-revise">ส่งกลับให้แก้ไข</button><button class="btn primary" id="rv-ok">ตรวจแล้ว</button>`
    });
    const send = async status => {
      const note = $('#rv-note', m.el).value.trim();
      if (status === 'revise' && !note) return toast('กรุณาเขียนสิ่งที่ต้องแก้ไข เพื่อให้ครูทราบ', true);
      try {
        await busy(() => api('reviewRecord', { id: r.id, status, note }));
        refreshPending();
        m.close(); toast(status === 'approved' ? 'บันทึกผล: ตรวจแล้ว' : status === 'revise' ? 'ส่งกลับให้แก้ไขแล้ว' : 'ยกเลิกผลตรวจแล้ว'); reload && reload();
      } catch (e) { }
    };
    $('#rv-ok', m.el).onclick = () => send('approved');
    $('#rv-revise', m.el).onclick = () => send('revise');
    const cl = $('#rv-clear', m.el); if (cl) cl.onclick = () => send('');
  }

  // โหลดรูปหลักฐานทีละรายการ (ไม่โหลดซ้ำ)
  const photoReq = new Map();
  function fetchPhotos(id) {
    if (!photoReq.has(id)) {
      photoReq.set(id, api('getPhotos', { id }).then(d => { PHOTO[`fs:${id}:1`] = d.p1; PHOTO[`fs:${id}:2`] = d.p2; })
        .catch(() => { photoReq.delete(id); }));
    }
    return photoReq.get(id);
  }
  async function loadPhotos(recs) {
    const ids = [...new Set(recs.filter(r => [r.photo1, r.photo2].some(p => /^fs:/.test(p || '') && !PHOTO[p])).map(r => r.id))];
    for (let i = 0; i < ids.length; i += 4) await Promise.all(ids.slice(i, i + 4).map(fetchPhotos)); // ทีละ 4 รายการ
  }
  const showPhoto = img => { const u = PHOTO[img.dataset.fs]; if (u) { img.src = u; img.dataset.full = u; img.removeAttribute('data-fs'); return true; } return false; };
  // โหลดรูปเฉพาะการ์ดที่กำลังจะเลื่อนมาถึง (ประหยัดเน็ตและเร็วขึ้นบนมือถือ)
  const photoIO = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target; photoIO.unobserve(img);
      const key = img.dataset.fs; if (!key) return;
      fetchPhotos(key.split(':')[1]).then(() => { if (img.isConnected) showPhoto(img); });
    });
  }, { rootMargin: '500px 0px' }) : null;
  function hydratePhotos(root) {
    $$('img[data-fs]', root).forEach(img => {
      if (showPhoto(img)) return;
      if (photoIO) photoIO.observe(img);
      else fetchPhotos(img.dataset.fs.split(':')[1]).then(() => showPhoto(img));
    });
  }

  function bindRecList(root, list, reload, whoFn) {
    hydratePhotos(root);
    $$('.rec', root).forEach(el => {
      const r = list.find(x => x.id === el.dataset.id);
      const more = $('[data-more]', el); if (more) more.onclick = () => { $('.know', el).classList.toggle('clamp'); more.textContent = $('.know', el).classList.contains('clamp') ? 'อ่านทั้งหมด' : 'ย่อ'; };
      const ed = $('[data-edit]', el); if (ed) ed.onclick = async () => { try { await busy(() => loadPhotos([r])); } catch (e) { } recordForm(r, reload, kindOf(r)); };
      const rv = $('[data-review]', el); if (rv) rv.onclick = () => reviewForm(r, el.dataset.who, reload);
      const dl = $('[data-del]', el); if (dl) dl.onclick = async () => {
        if (!(await confirmBox(`ลบรายการ “${r.title}” และรูปหลักฐานทั้งหมด?`, 'ลบรายการ'))) return;
        try { await busy(() => api('deleteRecord', { id: r.id })); toast('ลบรายการแล้ว'); reload(); } catch (e) { }
      };
    });
  }

  // หน้าของครู: การพัฒนาตนเอง / รายงานโล่/รางวัล / รายการวิทยากร
  async function viewKind(v, kind) {
    const K = KIND[kind];
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>${K.head}</h1><div class="muted small">${K.desc}</div></div>
      <div class="actions no-print"><label class="field" style="min-width:220px"><span>ปีงบประมาณ</span>${yearSelect('dev-fy', S.fy)}</label></div></div>
      <div id="dev-body" class="stack" data-kind="${kind}"><div class="empty-state">กำลังโหลด…</div></div>`;
    $('#dev-fy').onchange = e => { S.fy = e.target.value; S.devProj = ''; loadKind(kind); };
    loadKind(kind);
  }

  function kindStats(kind, list) {
    const st = (v, k, extra = '') => `<div class="stat"><div class="v">${v}${extra}</div><div class="k">${k}</div></div>`;
    if (kind === 'award') {
      const lv = l => list.filter(r => r.level === l).length;
      return st(list.length, 'รางวัลทั้งหมด') + st(lv('ระดับอำเภอ'), 'ระดับอำเภอ') + st(lv('ระดับจังหวัด'), 'ระดับจังหวัด') + st(lv('ระดับภาค') + lv('ระดับประเทศ') + lv('ระดับนานาชาติ'), 'ระดับภาคขึ้นไป');
    }
    if (kind === 'speaker') {
      return st(list.length, 'ครั้งที่เป็นวิทยากร') + st(sumHours(list).toLocaleString('th-TH'), 'ชั่วโมงรวม') + st(new Set(list.map(r => r.organizer).filter(Boolean)).size, 'หน่วยงานที่เชิญ');
    }
    const projs = S.meta.projects.filter(p => p.year === S.fy);
    return st(list.length, 'รายการทั้งหมด') + st(sumHours(list).toLocaleString('th-TH'), 'ชั่วโมงพัฒนารวม') + st(list.filter(r => r.type === 'ศึกษาดูงาน').length, 'ศึกษาดูงาน')
      + st(new Set(list.map(r => r.projectId).filter(id => id && id !== 'OTHER')).size, 'โครงการที่เข้าร่วม', `<span class="small muted"> / ${projs.length}</span>`);
  }

  async function loadKind(kind) {
    const box = $('#dev-body'); if (!box || box.dataset.kind !== kind) return;
    const K = KIND[kind], reload = () => loadKind(kind);
    if (!S.meta.years.length) { box.innerHTML = `<div class="empty-state">ยังไม่มีปีงบประมาณในระบบ กรุณาแจ้งผู้ดูแลระบบให้เพิ่มปีงบประมาณ</div>`; return; }
    let list;
    try { list = ofKind(await busy(() => api('listRecords', { year: S.fy, mine: true })), kind); } catch (e) { return; }
    if (!box.isConnected) return;
    const projs = S.meta.projects.filter(p => p.year === S.fy);
    const projName = id => id === 'OTHER' ? 'อื่น ๆ (นอกโครงการ)' : ((projs.find(p => p.id === id) || {}).name || '');
    if (!K.project || (S.devProj && !projName(S.devProj))) S.devProj = '';
    const shown = S.devProj ? list.filter(r => r.projectId === S.devProj) : list;
    box.innerHTML = `
      <div class="stats">${kindStats(kind, list)}</div>
      <div class="page-head no-print" style="margin-top:.4rem"><div class="grow"><h2>รายการ ปีงบประมาณ พ.ศ. ${esc(S.fy)}</h2><div class="small muted">${fyRange(S.fy)}${S.devProj ? ` · แสดง ${shown.length} จาก ${list.length} รายการ` : ''}</div></div>
        <div class="actions"><button class="btn" id="dev-pdf">ดาวน์โหลด PDF${S.devProj ? ' โครงการนี้' : ''}</button><button class="btn accent" id="dev-add">${K.add}</button></div></div>
      ${K.project ? `<div class="toolbar no-print"><label class="field" style="flex:1 1 320px"><span>แสดงเฉพาะโครงการ</span><select id="dev-proj">
        <option value="">ทุกโครงการ (${list.length} รายการ)</option>
        ${projs.concat(list.some(r => r.projectId === 'OTHER') ? [{ id: 'OTHER', name: 'อื่น ๆ (นอกโครงการ)' }] : []).map((p, i) => `<option value="${esc(p.id)}" ${p.id === S.devProj ? 'selected' : ''}>${p.id === 'OTHER' ? '' : (i + 1) + '. '}${esc(p.name)} (${list.filter(r => r.projectId === p.id).length} รายการ)</option>`).join('')}
      </select></label></div>` : ''}
      ${list.some(r => r.review === 'revise') ? `<div class="notice revise-alert"><div class="grow"><b>มี ${list.filter(r => r.review === 'revise').length} รายการที่ผู้บริหารส่งกลับให้แก้ไข</b> อ่านความเห็นในรายการ แล้วกด “แก้ไข” เพื่อปรับปรุง เมื่อบันทึกแล้วสถานะจะกลับเป็น “รอตรวจ”</div></div>` : ''}
      <div class="recs">${shown.length ? shown.map(r => recCard(r, { mode: 'own' })).join('') : list.length ? '<div class="empty-state">ยังไม่มีรายการในโครงการนี้</div>' : `<div class="empty-state">ยังไม่มีรายการในปีงบประมาณนี้<br>${K.empty}</div>`}</div>`;
    $('#dev-add').onclick = () => recordForm({ year: S.fy, kind }, reload, kind);
    const dp = $('#dev-proj'); if (dp) dp.onchange = e => { S.devProj = e.target.value; reload(); };
    $('#dev-pdf').onclick = () => reportPerson(S.user, shown, { year: S.fy, profile: false, kind, project: S.devProj ? projName(S.devProj) : '' });
    bindRecList(box, shown, reload);
  }

  function dateSel(prefix, iso, allowEmpty) {
    const p = parseISO(iso);
    const nowBE = new Date().getFullYear() + 543;
    const years = range(nowBE - 6, nowBE + 2).reverse();
    return `<div class="date3">
      <select id="${prefix}-d" aria-label="วันที่">${allowEmpty ? '<option value="">วัน</option>' : ''}${range(1, 31).map(d => `<option ${p && p.d === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select id="${prefix}-m" aria-label="เดือน">${allowEmpty ? '<option value="">เดือน</option>' : ''}${TH_M.map((m, i) => `<option value="${i + 1}" ${p && p.m === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <select id="${prefix}-y" aria-label="ปี พ.ศ.">${allowEmpty ? '<option value="">พ.ศ.</option>' : ''}${years.map(y => `<option value="${y}" ${p && p.y + 543 === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>`;
  }
  function readDate(root, prefix) {
    const d = $(`#${prefix}-d`, root).value, m = $(`#${prefix}-m`, root).value, y = $(`#${prefix}-y`, root).value;
    if (!d || !m || !y) return '';
    const ce = Number(y) - 543;
    const dt = new Date(ce, Number(m) - 1, Number(d));
    if (dt.getMonth() !== Number(m) - 1) return 'INVALID';
    return `${ce}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function recordForm(r, reload, kind) {
    kind = kind || kindOf(r);
    const K = KIND[kind];
    const isNew = !r.id;
    const today = new Date(); const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const photos = [r.photo1 ? 'keep' : null, r.photo2 ? 'keep' : null];
    const previews = [photoUrl(r.photo1), photoUrl(r.photo2)];
    const projOpts = y => S.meta.projects.filter(p => p.year === y).map((p, i) => `<option value="${esc(p.id)}" ${p.id === r.projectId ? 'selected' : ''}>${i + 1}. ${esc(p.name)}</option>`).join('')
      + `<option value="OTHER" ${r.projectId === 'OTHER' ? 'selected' : ''}>อื่น ๆ (นอกโครงการ / พัฒนาตนเอง)</option>`;
    const types = K.types.concat(r.type && !K.types.includes(r.type) ? [r.type] : []);
    const m = modal({
      title: isNew ? K.addTitle : K.editTitle,
      body: `${r.review === 'approved' ? '<div class="notice info"><div class="grow">รายการนี้ผู้บริหารตรวจแล้ว ถ้าบันทึกการแก้ไข สถานะจะกลับเป็น “รอตรวจ”</div></div>' : ''}${r.review === 'revise' ? `<div class="review-note revise"><b>สิ่งที่ต้องแก้ไข</b><div>${esc(r.reviewNote || '')}</div></div>` : ''}
      <div class="grid">
        <label class="field"><span>ปีงบประมาณ <span class="req">*</span></span>${yearSelect('rf-year', r.year || S.fy)}</label>
        ${K.project ? `<label class="field"><span>โครงการพัฒนาบุคลากร <span class="req">*</span></span><select id="rf-proj">${projOpts(r.year || S.fy)}</select></label>` : ''}
        <label class="field"><span>${K.typeLabel} <span class="req">*</span></span><select id="rf-type">${types.map(t => `<option ${t === r.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        ${K.level ? `<label class="field"><span>ระดับรางวัล <span class="req">*</span></span><select id="rf-level">${AWARD_LEVELS.map(t => `<option ${t === r.level ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
        ${K.hours ? `<label class="field"><span>จำนวนชั่วโมง</span><input type="number" id="rf-hours" min="0" step="0.5" value="${esc(r.hours || '')}" placeholder="เช่น 6"></label>` : ''}
        <label class="field wide"><span>${K.titleLabel} <span class="req">*</span></span><input type="text" id="rf-title" value="${esc(r.title || '')}" placeholder="${esc(K.titlePh)}"></label>
        <label class="field"><span>${K.orgLabel}</span><input type="text" id="rf-org" value="${esc(r.organizer || '')}"></label>
        <label class="field"><span>${K.placeLabel}</span><input type="text" id="rf-place" value="${esc(r.place || '')}"></label>
        ${K.audience ? `<label class="field wide"><span>กลุ่มผู้เข้าร่วม / จำนวน</span><input type="text" id="rf-aud" value="${esc(r.audience || '')}" placeholder="เช่น ผู้เรียน กศน. ตำบลงิม 30 คน"></label>` : ''}
        <div class="wide dates"><div class="field"><span>${K.dateLabel} <span class="req">*</span></span>${dateSel('rf-s', r.startDate || todayISO)}</div>
        ${K.range ? `<div class="field"><span>ถึงวันที่ (ถ้ามีหลายวัน)</span>${dateSel('rf-e', r.endDate, true)}</div>` : ''}</div>
        <label class="field wide"><span>${K.detailLabel}${K.detailReq ? ' <span class="req">*</span>' : ''}</span><textarea id="rf-know" rows="${K.detailReq ? 6 : 4}" placeholder="${esc(K.detailPh)}">${esc(r.knowledge || '')}</textarea></label>
      </div>
      <div class="field"><span>รูปภาพหลักฐาน (2 รูป)</span>
        <div class="photo-pick">${[0, 1].map(i => `<div class="pp" data-i="${i}"><div class="pv"></div><div class="row"><label class="btn sm" for="rf-ph${i}">เลือกรูปที่ ${i + 1}</label><input type="file" accept="image/*" id="rf-ph${i}"><button type="button" class="btn sm danger" data-rm>ลบรูป</button></div></div>`).join('')}</div>
        <div class="small muted">ระบบจะย่อขนาดรูปให้อัตโนมัติก่อนอัปโหลด</div></div>`,
      foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn primary" id="rf-save">บันทึกรายการ</button>`
    });
    const el = m.el;
    if (K.project) $('#rf-year', el).onchange = e => { $('#rf-proj', el).innerHTML = projOpts(e.target.value); };
    const paint = i => {
      const pv = $(`.pp[data-i="${i}"] .pv`, el);
      pv.innerHTML = previews[i] ? `<img src="${esc(previews[i])}" alt="ตัวอย่างรูปที่ ${i + 1}">` : `<div class="ph">ยังไม่มีรูปที่ ${i + 1}</div>`;
      $(`.pp[data-i="${i}"] [data-rm]`, el).hidden = !previews[i];
    };
    [0, 1].forEach(i => {
      paint(i);
      $(`#rf-ph${i}`, el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          let data = await resizeImage(f, 1000, 0.72);
          if (data.length > 420000) data = await resizeImage(f, 800, 0.6);
          photos[i] = { data, mime: 'image/jpeg' }; previews[i] = data; paint(i);
        } catch (err) { toast('อ่านไฟล์รูปไม่ได้ กรุณาเลือกไฟล์ภาพ (JPG/PNG)', true); }
        e.target.value = '';
      };
      $(`.pp[data-i="${i}"] [data-rm]`, el).onclick = () => { photos[i] = null; previews[i] = ''; paint(i); };
    });
    $('#rf-save', el).onclick = async () => {
      const val = id => { const x = $(id, el); return x ? x.value.trim() : ''; };
      const startDate = readDate(el, 'rf-s'), endDate = K.range ? readDate(el, 'rf-e') : '';
      const rec = {
        id: r.id, staffId: r.staffId, kind, year: val('#rf-year'), projectId: K.project ? val('#rf-proj') : '', type: val('#rf-type'), level: K.level ? val('#rf-level') : '',
        hours: K.hours ? val('#rf-hours') : '', title: val('#rf-title'), place: val('#rf-place'), organizer: val('#rf-org'), audience: K.audience ? val('#rf-aud') : '',
        startDate, endDate, knowledge: val('#rf-know')
      };
      if (!rec.title) return toast('กรุณากรอก' + K.titleLabel.split(' / ')[0], true);
      if (!startDate || startDate === 'INVALID') return toast('วันที่ไม่ถูกต้อง', true);
      if (endDate === 'INVALID') return toast('วันที่สิ้นสุดไม่ถูกต้อง', true);
      if (endDate && endDate < startDate) return toast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม', true);
      if (K.detailReq && !rec.knowledge) return toast('กรุณากรอก' + K.detailShort, true);
      const ph = photos.map((p, i) => p === 'keep' ? 'keep' : p ? p : (r['photo' + (i + 1)] ? null : 'keep'));
      try {
        await busy(() => api('saveRecord', { record: rec, photos: ph }));
        m.close(); toast(isNew ? 'เพิ่มรายการแล้ว' : 'บันทึกการแก้ไขแล้ว');
        if (rec.year !== S.fy && S.tab === K.tab) { S.fy = rec.year; const s = $('#dev-fy'); if (s) s.value = rec.year; }
        reload && reload();
      } catch (e) { }
    };
  }

  function resizeImage(file, max, q) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error('not image'));
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  /* ---------------- admin ---------------- */
  async function getStaff(force) {
    if (!S.cache.staff || force) S.cache.staff = await api('listStaff');
    return S.cache.staff;
  }

  async function viewOverview(v) {
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>ภาพรวมการพัฒนาบุคลากร</h1><div class="muted small" id="ov-range">${S.fy ? fyRange(S.fy) : ''}</div></div>
      <div class="actions"><label class="field" style="min-width:220px"><span>ปีงบประมาณ</span>${yearSelect('ov-fy', S.fy)}</label></div></div><div id="ov-body" class="stack"></div>`;
    $('#ov-fy').onchange = e => { S.fy = e.target.value; viewOverview(v); };
    let staff, recs, allRecs;
    try { [staff, allRecs] = await busy(() => Promise.all([getStaff(), api('listRecords', { year: S.fy })])); } catch (e) { return; }
    if (!v.isConnected) return;
    recs = ofKind(allRecs, 'dev');
    const awards = ofKind(allRecs, 'award'), talks = ofKind(allRecs, 'speaker');
    const by = {}; recs.forEach(r => (by[r.staffId] = by[r.staffId] || []).push(r));
    const rows = staff.map(s => ({ s, list: by[s.id] || [] })).sort((a, b) => sumHours(b.list) - sumHours(a.list) || b.list.length - a.list.length);
    const maxH = Math.max(1, ...rows.map(x => sumHours(x.list)));
    const none = rows.filter(x => !x.list.length).length;
    const projs = S.meta.projects.filter(p => p.year === S.fy);
    const pc = {}; recs.forEach(r => pc[r.projectId] = (pc[r.projectId] || 0) + 1);
    const ppl = {}; recs.forEach(r => (ppl[r.projectId] = ppl[r.projectId] || new Set()).add(r.staffId));
    $('#ov-body').innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${staff.length}</div><div class="k">บุคลากรทั้งหมด (คน)</div></div>
        <div class="stat"><div class="v">${recs.length}</div><div class="k">รายการพัฒนาตนเอง</div></div>
        <div class="stat"><div class="v">${sumHours(recs).toLocaleString('th-TH')}</div><div class="k">ชั่วโมงพัฒนารวม</div></div>
        <div class="stat"><div class="v" style="color:${none ? 'var(--warn)' : 'var(--good)'}">${none}</div><div class="k">คนที่ยังไม่มีรายการ</div></div>
        <div class="stat"><div class="v" style="color:${recs.some(r => !r.review) ? 'var(--warn)' : 'var(--good)'}">${recs.filter(r => !r.review).length}</div><div class="k">รายการพัฒนาฯ รอตรวจ</div></div>
        <div class="stat click" data-go="awards" title="ไปที่ ${KIND.award.adminMenu}"><div class="v">${awards.length}</div><div class="k">โล่/รางวัล (${new Set(awards.map(r => r.staffId)).size} คน)${awards.some(r => !r.review) ? ` · <span style="color:var(--warn)">รอตรวจ ${awards.filter(r => !r.review).length}</span>` : ''}</div></div>
        <div class="stat click" data-go="speakers" title="ไปที่ ${KIND.speaker.adminMenu}"><div class="v">${talks.length}</div><div class="k">งานวิทยากร (${sumHours(talks)} ชม.)${talks.some(r => !r.review) ? ` · <span style="color:var(--warn)">รอตรวจ ${talks.filter(r => !r.review).length}</span>` : ''}</div></div>
      </div>
      <section class="panel"><h3>การเข้าร่วมตามโครงการ ปีงบประมาณ ${esc(S.fy)}</h3>
        ${projs.length || pc.OTHER ? `<div class="table-wrap"><table><thead><tr><th>โครงการ</th><th class="r">ผู้เข้าร่วม (คน)</th><th class="r">รายการ</th></tr></thead><tbody>
        ${projs.concat(pc.OTHER ? [{ id: 'OTHER', name: 'อื่น ๆ (นอกโครงการ)' }] : []).map(p => `<tr class="click" data-proj="${esc(p.id)}" title="ดูรายการของโครงการนี้"><td>${esc(p.name)} <span class="small muted">› ดูรายการ</span></td><td class="r num">${ppl[p.id] ? ppl[p.id].size : 0}</td><td class="r num">${pc[p.id] || 0}</td></tr>`).join('')}
        </tbody></table></div>` : `<p class="muted" style="margin:0">ยังไม่มีโครงการในปีนี้ เพิ่มได้ที่เมนู “ตั้งค่าปีงบ/โครงการ”</p>`}
      </section>
      <section><div class="page-head" style="margin-bottom:.6rem"><div class="grow"><h2>รายบุคคล</h2><div class="small muted">คลิกที่ชื่อเพื่อดูประวัติ รายการพัฒนาตนเอง โล่/รางวัล และงานวิทยากร</div></div></div>
      <div class="table-wrap"><table><thead><tr><th>ชื่อ-สกุล</th><th class="r">รายการ</th><th class="r">ชั่วโมง</th><th style="width:28%">สัดส่วนชั่วโมง</th><th class="r">รางวัล</th><th class="r">วิทยากร</th><th>ล่าสุด</th></tr></thead><tbody>
      ${rows.map(({ s, list }) => `<tr class="click" data-id="${esc(s.id)}"><td>${esc(fullName(s))}</td><td class="r num">${list.length || '<span class="chip warn">ยังไม่มี</span>'}</td><td class="r num">${sumHours(list) || '—'}</td>
        <td><div class="bar"><i style="width:${(sumHours(list) / maxH * 100).toFixed(1)}%"></i></div></td><td class="r num">${awards.filter(r => r.staffId === s.id).length || '—'}</td><td class="r num">${talks.filter(r => r.staffId === s.id).length || '—'}</td><td class="small num">${list[0] ? esc(thDate(list[0].startDate, true)) : '—'}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    $$('#ov-body tr.click[data-id]').forEach(tr => tr.onclick = () => staffDetail(staff.find(s => s.id === tr.dataset.id), () => viewOverview(v)));
    $$('#ov-body [data-go]').forEach(el => el.onclick = () => { S.tab = el.dataset.go; store.set('hr_tab_' + S.role, S.tab); render(); });
    $$('#ov-body tr.click[data-proj]').forEach(tr => tr.onclick = () => { S.cache.recPreset = { fy: S.fy, proj: tr.dataset.proj }; S.tab = 'records'; render(); });
  }

  async function staffDetail(s, reload) {
    let recs;
    try { recs = await busy(() => api('listRecords', { staffId: s.id })); } catch (e) { return; }
    const years = [...new Set(recs.map(r => r.year))].sort().reverse();
    const m = modal({
      title: fullName(s),
      body: `<div class="toolbar">${FB && !s.hasAccount ? '<span class="chip bad">ยังไม่มีบัญชีเข้าสู่ระบบ</span>' : `<span class="chip ${s.pwChanged ? 'good' : 'warn'}">${s.pwChanged ? 'เปลี่ยนรหัสผ่านแล้ว' : 'รหัสผ่านเริ่มต้น (เบอร์โทร)'}</span>`}
        ${FB && s.hasAccount ? (s.loginEmail ? `<span class="chip">อีเมลรีเซ็ตรหัส: ${esc(s.loginEmail)}</span>` : '<span class="chip warn">บัญชีไม่มีอีเมล รีเซ็ตรหัสทางอีเมลไม่ได้</span>') : ''}${s.role === 'admin' ? '<span class="chip ink">ผู้บริหาร</span>' : ''}</div>
        ${profileHTML(s)}
        ${KINDS.map(k => { const kl = ofKind(recs, k); if (k !== 'dev' && !kl.length) return ''; return `<section class="panel"><h3>${k === 'dev' ? 'ประวัติการพัฒนาตนเอง' : KIND[k].head} (${kl.length} รายการ${KIND[k].hours ? ` · ${sumHours(kl)} ชั่วโมง` : ''})</h3>
        ${kl.length ? years.filter(y => kl.some(r => r.year === y)).map(y => `<h3 style="margin:.6rem 0">ปีงบประมาณ ${esc(y)}</h3><div class="recs">${kl.filter(r => r.year === y).map(r => recCard(r, { who: fullName(s), mode: r.staffId === S.user.id ? 'view' : 'review' })).join('')}</div>`).join('') : '<p class="muted" style="margin:0">ยังไม่มีรายการ</p>'}</section>`; }).join('')}`,
      foot: `<button class="btn danger" id="sd-del">ลบบุคลากร</button><button class="btn" id="sd-reset">${FB ? 'ส่งลิงก์รีเซ็ตรหัสผ่าน' : 'รีเซ็ตรหัสผ่าน'}</button>${FB ? '<button class="btn" id="sd-recreate">สร้างบัญชีใหม่</button>' : ''}<button class="btn" id="sd-pdf">ดาวน์โหลด PDF</button><button class="btn primary" id="sd-edit">แก้ไขข้อมูล</button>`
    });
    bindRecList(m.el, recs, () => { m.close(); staffDetail(s, reload); reload && reload(); });
    $('#sd-pdf', m.el).onclick = () => reportPerson(s, recs, { profile: true });
    $('#sd-edit', m.el).onclick = () => editProfile(s, true, nu => { m.close(); S.cache = {}; staffDetail(nu, reload); reload && reload(); });
    $('#sd-reset', m.el).onclick = async () => {
      const q = FB ? `ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของ ${fullName(s)} และให้สิทธิ์เปลี่ยนรหัสผ่านในระบบได้อีก 1 ครั้ง?` : `รีเซ็ตรหัสผ่านของ ${fullName(s)} กลับเป็นเบอร์โทรศัพท์ (${s.phone || '-'}) และให้สิทธิ์เปลี่ยนได้อีก 1 ครั้ง?`;
      if (!(await confirmBox(q, FB ? 'ส่งลิงก์' : 'รีเซ็ต', false))) return;
      try { const nu = await busy(() => api('resetPassword', { id: s.id })); Object.assign(s, nu); toast(nu._msg || 'รีเซ็ตรหัสผ่านแล้ว'); m.close(); staffDetail(s, reload); } catch (e) { }
    };
    const rc = $('#sd-recreate', m.el); if (rc) rc.onclick = async () => {
      if (!(await confirmBox(`สร้างบัญชีเข้าสู่ระบบใหม่ให้ ${fullName(s)} ด้วยอีเมล ${s.email || '(ไม่มี)'} รหัสผ่านจะกลับเป็นเบอร์โทร ${s.phone || '-'} บัญชีเดิมจะใช้ไม่ได้ ใช้เมื่อแก้อีเมลแล้ว หรือยังไม่มีบัญชี`, 'สร้างบัญชีใหม่', false))) return;
      try { const nu = await busy(() => api('recreateAccount', { id: s.id })); Object.assign(s, nu); toast(nu._msg || 'สร้างบัญชีแล้ว'); m.close(); S.cache = {}; staffDetail(s, reload); } catch (e) { }
    };
    $('#sd-del', m.el).onclick = async () => {
      if (!(await confirmBox(`ลบ ${fullName(s)} ออกจากระบบ พร้อมรายการพัฒนาตนเองและรูปทั้งหมด? การลบนี้ย้อนกลับไม่ได้`, 'ลบบุคลากร'))) return;
      try { await busy(() => api('deleteStaff', { id: s.id })); toast('ลบบุคลากรแล้ว'); m.close(); S.cache = {}; reload && reload(); } catch (e) { }
    };
  }

  async function viewStaff(v) {
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>ข้อมูลบุคลากร</h1><div class="muted small" id="st-count"></div></div>
      <div class="actions"><button class="btn" id="st-pdf">ดาวน์โหลด PDF</button><button class="btn accent" id="st-add">+ เพิ่มบุคลากร</button></div></div>
      <div class="toolbar"><label class="field"><span>ค้นหา</span><input type="text" id="st-q" placeholder="ชื่อ นามสกุล วุฒิ วิชาเอก เบอร์โทร"></label></div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อ-สกุล</th><th>วุฒิ / วิชาเอก</th><th>เบอร์โทร</th><th>อายุ</th><th>เงินเดือน</th><th>รหัสผ่าน</th></tr></thead><tbody id="st-body"></tbody></table></div>`;
    let staff; try { staff = await busy(() => getStaff(true)); } catch (e) { return; }
    if (!v.isConnected) return;
    const draw = () => {
      const q = $('#st-q').value.trim().toLowerCase();
      const list = staff.filter(s => !q || [fullName(s), s.education, s.major, s.phone, s.position].join(' ').toLowerCase().includes(q));
      $('#st-count').textContent = `ทั้งหมด ${staff.length} คน${q ? ` · พบ ${list.length} คน` : ''}`;
      $('#st-body').innerHTML = list.map((s, i) => `<tr class="click" data-id="${esc(s.id)}"><td class="num muted">${i + 1}</td><td><b>${esc(fullName(s))}</b>${s.role === 'admin' ? ' <span class="chip ink">ผู้บริหาร</span>' : ''}${s.position ? `<div class="small muted">${esc(s.position)}</div>` : ''}</td>
        <td>${esc(s.education || '—')}<div class="small muted">${esc(s.major || '')}</div></td><td class="num">${esc(s.phone || '—')}</td><td class="num">${age(s) || '—'}</td>
        <td class="num">${s.salary ? esc(Number(s.salary).toLocaleString('th-TH')) : '—'}</td><td>${s.pwChanged ? '<span class="chip good">เปลี่ยนแล้ว</span>' : '<span class="chip">เบอร์โทร</span>'}</td></tr>`).join('') || `<tr><td colspan="7" class="muted">ไม่พบข้อมูล</td></tr>`;
      $$('#st-body tr.click').forEach(tr => tr.onclick = () => staffDetail(staff.find(s => s.id === tr.dataset.id), () => viewStaff(v)));
    };
    $('#st-q').oninput = draw; draw();
    $('#st-add').onclick = () => editProfile({}, true, () => viewStaff(v));
    $('#st-pdf').onclick = () => {
      const q = $('#st-q').value.trim().toLowerCase();
      reportStaffList(staff.filter(s => !q || [fullName(s), s.education, s.major, s.phone, s.position].join(' ').toLowerCase().includes(q)));
    };
  }

  // หน้าผู้บริหาร: ดูและตรวจรายการของทุกคน (แยกตามประเภท)
  async function viewRecords(v, kind = 'dev') {
    const K = KIND[kind];
    let staff; try { staff = await busy(() => getStaff()); } catch (e) { return; }
    if (!v.isConnected) return;
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>${K.adminHead}</h1><div class="muted small" id="rc-count"></div></div>
      <div class="actions"><button class="btn" id="rc-pdf">ดาวน์โหลด PDF</button></div></div>
      <div class="toolbar">
        <label class="field"><span>ปีงบประมาณ</span>${yearSelect('rc-fy', S.fy, true)}</label>
        ${K.project ? '<label class="field"><span>โครงการ</span><select id="rc-proj"></select></label>' : ''}
        ${K.level ? `<label class="field"><span>ระดับรางวัล</span><select id="rc-level"><option value="">ทุกระดับ</option>${AWARD_LEVELS.map(t => `<option>${t}</option>`).join('')}</select></label>` : ''}
        <label class="field"><span>บุคลากร</span><select id="rc-staff"><option value="">ทุกคน</option>${staff.map((s, i) => `<option value="${esc(s.id)}">${i + 1}. ${esc(fullName(s))}</option>`).join('')}</select></label>
        <label class="field"><span>${K.typeLabel}</span><select id="rc-type"><option value="">ทุกประเภท</option>${K.types.map(t => `<option>${t}</option>`).join('')}</select></label>
        <label class="field"><span>สถานะการตรวจ</span><select id="rc-rv"><option value="all">ทุกสถานะ</option><option value="">รอตรวจ</option><option value="approved">ตรวจแล้ว</option><option value="revise">ส่งกลับแก้ไข</option></select></label>
      </div><div id="rc-body" class="stack"></div>`;
    const name = id => { const s = staff.find(x => x.id === id); return s ? fullName(s) : id; };
    const preset = kind === 'dev' ? S.cache.recPreset : null; if (preset) S.cache.recPreset = null;
    if (preset) $('#rc-fy').value = preset.fy;
    const fillProj = () => {
      if (!K.project) return;
      const y = $('#rc-fy').value;
      $('#rc-proj').innerHTML = `<option value="">ทุกโครงการ</option>` + S.meta.projects.filter(p => !y || p.year === y).map((p, i) => `<option value="${esc(p.id)}">${i + 1}. ${esc(p.name)}${y ? '' : ` (${p.year})`}</option>`).join('') + `<option value="OTHER">อื่น ๆ (นอกโครงการ)</option>`;
    };
    let all = [], known = null;
    // silent = โหลดเบื้องหลังจากการแจ้งเตือนเรียลไทม์ (ไม่ขึ้นหน้าจอโหลด และคงตัวกรอง/ตำแหน่งเลื่อนไว้)
    const load = async silent => {
      try {
        const res = ofKind(await (silent ? api('listRecords', { year: $('#rc-fy').value }) : busy(() => api('listRecords', { year: $('#rc-fy').value }))), kind);
        if (silent && known) res.forEach(r => { if (!known.has(r.id)) r._new = true; });
        known = new Set(res.map(r => r.id));
        all = res;
      } catch (e) { if (silent) return; all = []; }
      if (!v.isConnected) return;
      const y = window.scrollY; draw(); if (silent) window.scrollTo(0, y);
      refreshPending();
    };
    S.recLive = () => { if (v.isConnected) load(true); };
    const fv = id => { const x = $(id); return x ? x.value : ''; };
    const filtered = () => all.filter(r => (!fv('#rc-proj') || r.projectId === fv('#rc-proj')) && (!fv('#rc-level') || r.level === fv('#rc-level')) && (!fv('#rc-staff') || r.staffId === fv('#rc-staff')) && (!fv('#rc-type') || r.type === fv('#rc-type')) && (fv('#rc-rv') === 'all' || (r.review || '') === fv('#rc-rv')));
    const draw = () => {
      const list = filtered();
      $('#rc-count').textContent = `${list.length} รายการ${K.hours ? ` · ${sumHours(list)} ชั่วโมง` : ''} · รอตรวจ ${list.filter(r => !r.review).length} รายการ`;
      $('#rc-body').innerHTML = list.length ? `<div class="recs">${list.map(r => recCard(r, { who: name(r.staffId), mode: r.staffId === S.user.id ? 'view' : 'review', isNew: r._new })).join('')}</div>` : `<div class="empty-state">ไม่พบรายการตามเงื่อนไขที่เลือก</div>`;
      bindRecList($('#rc-body'), list, load);
    };
    $('#rc-fy').onchange = () => { fillProj(); load(); };
    ['#rc-proj', '#rc-level', '#rc-staff', '#rc-type', '#rc-rv'].forEach(id => { const x = $(id); if (x) x.onchange = draw; });
    $('#rc-pdf').onclick = () => {
      const sel = id => { const x = $(id); const o = x && x.selectedOptions[0]; return o && o.value ? o.textContent : ''; };
      const sub = [sel('#rc-fy') || 'ทุกปีงบประมาณ', sel('#rc-proj'), sel('#rc-level'), sel('#rc-staff'), sel('#rc-type')].filter(Boolean).join(' · ');
      reportRecords(filtered(), name, sub, kind);
    };
    fillProj();
    if (preset) $('#rc-proj').value = preset.proj;
    load();
  }

  /* ---------------- PDF reports: สร้างไฟล์ PDF ในเครื่องแล้วดาวน์โหลดทันที ---------------- */
  const PDF_CSS = `
    .rp-root{background:#fff;color:#111;font:15px/1.55 "Sarabun","Noto Sans Thai",Tahoma,sans-serif;text-align:left}
    .rp-root *{box-sizing:border-box}
    .rp-root header{text-align:center;border-bottom:2px solid #1d3a63;padding-bottom:8px;margin:0 0 14px}
    .rp-root .org{font-size:14px;color:#444}
    .rp-root h1{font:700 21px/1.4 "Sarabun",Tahoma,sans-serif;margin:2px 0;color:#111}
    .rp-root .sub{font-size:14px;color:#333}
    .rp-root h2{font:700 16px/1.4 "Sarabun",Tahoma,sans-serif;margin:16px 0 6px;padding-left:8px;border-left:4px solid #c98a12;color:#111}
    .rp-root table{width:100%;border-collapse:collapse;font-size:13.5px;margin:0}
    .rp-root table tr th,.rp-root table tr td{border:1px solid #9aa4b2;padding:4px 6px;vertical-align:top;text-align:left;color:#111;font-size:13.5px;white-space:normal}
    .rp-root table tr th{background:#eef2f7;font-weight:700}
    .rp-root table tr .r{text-align:right} .rp-root table tr .c{text-align:center}
    .rp-root table.rp-kv tr td:first-child{width:34%;background:#f6f8fb;color:#333}
    .rp-root .rp-rec{border:1px solid #9aa4b2;border-radius:6px;padding:8px 10px;margin:10px 0}
    .rp-root .rp-t{font-weight:700;font-size:15px}
    .rp-root .rp-m{font-size:13px;color:#333;margin:2px 0 6px}
    .rp-root .rp-k{font-size:13px;font-weight:700;color:#222;margin-top:6px}
    .rp-root .rp-p{margin:2px 0 6px;white-space:pre-wrap;overflow-wrap:anywhere}
    .rp-root .rp-ph{display:flex;gap:8px}
    .rp-root .rp-img{flex:1;height:200px;border:1px solid #ccc;border-radius:4px;background:#f3f3f3 center/cover no-repeat}
    .rp-root .rp-none{flex:1;height:60px;border:1px dashed #bbb;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
    .rp-root .rp-sum{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;margin:4px 0 10px}
    .rp-root .rp-sign{display:flex;justify-content:space-around;gap:20px;margin-top:36px;text-align:center;font-size:14px;line-height:2.1}
    .rp-root footer{margin-top:18px;font-size:11.5px;color:#666;text-align:right}
    .rp-root .rp-empty{color:#666;text-align:center;padding:16px;border:1px dashed #bbb}`;

  function thToday() { const d = new Date(); return `${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear() + 543}`; }

  const PDF_LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
  let pdfLibsP = null;
  function loadPdfLibs() {
    if (window.html2canvas && window.jspdf) return Promise.resolve();
    if (!pdfLibsP) pdfLibsP = Promise.all(PDF_LIBS.map(src => new Promise((res, rej) => {
      const sc = document.createElement('script'); sc.src = src; sc.onload = res;
      sc.onerror = () => { pdfLibsP = null; rej(new Error('โหลดตัวสร้าง PDF ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')); };
      document.head.appendChild(sc);
    })));
    return pdfLibsP;
  }

  function pdfOverlay(msg) {
    const el = document.createElement('div'); el.className = 'loading pdf-busy';
    el.innerHTML = `<div class="pdf-busy-box"><div class="spinner" role="status"></div><div class="pdf-busy-msg">${esc(msg)}</div></div>`;
    document.body.appendChild(el);
    return { set: t => { const m = $('.pdf-busy-msg', el); if (m) m.textContent = t; }, close: () => el.remove() };
  }

  // ตัดตารางให้พอดีพื้นที่ที่เหลือในหน้า: แถวที่ไม่พอย้ายไปตารางใหม่ (มีหัวตารางซ้ำ) ต่อหน้าถัดไป
  function splitTableToFit(t, room) {
    const tb = t.tBodies[0];
    if (!tb || tb.rows.length < 2) return null;
    const rest = t.cloneNode(false);
    if (t.tHead) rest.appendChild(t.tHead.cloneNode(true));
    const rb = t.ownerDocument.createElement('tbody'); rest.appendChild(rb);
    t.after(rest);
    while (t.getBoundingClientRect().height > room && tb.rows.length > 1) rb.insertBefore(tb.rows[tb.rows.length - 1], rb.firstChild);
    if (t.getBoundingClientRect().height > room || !rb.rows.length) {
      while (rb.rows.length) tb.appendChild(rb.rows[0]);
      rest.remove(); return null;
    }
    return rest;
  }

  const safeName = s => String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 80);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
  const isPhone = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 700;

  async function openReport({ title, subtitle = '', build, recs = [], landscape = false, filename = '' }) {
    const ov = pdfOverlay('กำลังเตรียมข้อมูล…');
    let ifr = null;
    try {
      await Promise.all([loadPdfLibs(), loadPhotos(recs).catch(() => { })]);
      // หน่วยพิกเซลที่ 96 dpi: A4 = 794 × 1123
      const PW = landscape ? 1123 : 794, PH = landscape ? 794 : 1123, M = 38, CW = PW - M * 2, CH = PH - M * 2 - 14;
      // สร้างรายงานในหน้าแยกขนาดเล็ก (ไม่มีรูป/เนื้อหาของหน้าเว็บหลัก) เพื่อให้มือถือประมวลผลเร็ว
      ifr = document.createElement('iframe');
      ifr.setAttribute('aria-hidden', 'true');
      ifr.style.cssText = `position:fixed;left:-${PW * 3}px;top:0;width:${PW}px;height:${PH}px;border:0;`;
      document.body.appendChild(ifr);
      const idoc = ifr.contentDocument, iwin = ifr.contentWindow;
      idoc.open();
      idoc.write(`<!doctype html><html lang="th"><head><meta charset="utf-8">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap">
        <style>html,body{margin:0;background:#fff}${PDF_CSS}.rp-page{display:flow-root;background:#fff}</style></head>
        <body><div class="rp-root" style="width:${CW}px"><header><div class="org">${esc(CFG.ORG_NAME)}</div><h1>${esc(title)}</h1>${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}</header>${build()}<footer>พิมพ์จาก${esc(CFG.APP_TITLE)} เมื่อวันที่ ${thToday()}</footer></div></body></html>`);
      idoc.close();
      // โหลดตัวแปลงภาพเข้าไปในหน้าแยก (ใช้ไฟล์ที่โหลดไว้แล้ว)
      await withTimeout(new Promise((res, rej) => {
        const sc = idoc.createElement('script'); sc.src = PDF_LIBS[0]; sc.onload = res; sc.onerror = () => rej(new Error('โหลดตัวสร้าง PDF ไม่ได้'));
        idoc.head.appendChild(sc);
      }), 30000, 'โหลดตัวสร้าง PDF ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
      if (idoc.fonts && idoc.fonts.ready) await Promise.race([idoc.fonts.ready, sleep(4000)]);
      await sleep(50);

      // 1) จัดหน้า: วัดความสูงแต่ละส่วน แล้วกำหนดว่าอยู่หน้าไหน (ตัดตารางยาวให้พอดีหน้า)
      const root = idoc.querySelector('.rp-root');
      const blocks = [...root.children];
      const pages = [[]];
      let y = 0, prevBottom = null;
      for (let i = 0; i < blocks.length; i++) {
        const el = blocks[i];
        let r = el.getBoundingClientRect();
        const gap = prevBottom == null ? 0 : Math.max(0, r.top - prevBottom);
        const fitTable = room => {
          if (el.tagName === 'TABLE' && r.height > room) {
            const rest = splitTableToFit(el, room);
            if (rest) { blocks.splice(i + 1, 0, rest); r = el.getBoundingClientRect(); }
          }
        };
        if (y > 0) fitTable(CH - y - gap);
        let need = r.height;
        // หัวข้อต้องอยู่หน้าเดียวกับเนื้อหาส่วนแรกของมัน (สรุปสั้น ๆ + รายการแรก/หัวตาราง)
        if (el.tagName === 'H2') {
          for (let j = i + 1; blocks[j]; j++) {
            const nb = blocks[j], h = nb.getBoundingClientRect().height + 12;
            if (nb.tagName === 'TABLE') { need += 90; break; }
            if (nb.tagName === 'H2') break;
            if (nb.classList.contains('rp-rec') || h > CH * 0.35) { need += Math.min(h, CH * 0.35); break; }
            need += h;
          }
        }
        if (y > 0 && y + gap + Math.min(need, CH) > CH) { pages.push([]); y = 0; fitTable(CH); }
        else if (y > 0) y += gap;
        else fitTable(CH);
        pages[pages.length - 1].push(el);
        y += r.height;
        prevBottom = r.bottom;
        if (y > CH) { pages.push([]); y = 0; prevBottom = null; } // ส่วนที่ยาวเกินหนึ่งหน้า: ตัดภาพภายหลัง
      }
      const pageEls = pages.filter(g => g.length).map(g => {
        const d = idoc.createElement('div'); d.className = 'rp-page'; d.style.width = CW + 'px';
        g.forEach(el => d.appendChild(el)); return d;
      });
      root.innerHTML = '';
      pageEls.forEach(d => root.appendChild(d));

      // 2) แปลงทีละหน้าเป็นภาพ แล้วใส่ลง PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4', compress: true });
      const k = 0.75, scale = isPhone() ? 1.5 : 2;
      let first = true;
      for (let n = 0; n < pageEls.length; n++) {
        ov.set(`กำลังสร้างไฟล์ PDF… หน้า ${n + 1} จาก ${pageEls.length}`);
        await sleep(30); // ให้หน้าจออัปเดตข้อความ
        const el = pageEls[n];
        const canvas = await withTimeout(iwin.html2canvas(el, { scale, backgroundColor: '#ffffff', logging: false, useCORS: true, imageTimeout: 15000 }),
          90000, 'สร้าง PDF ใช้เวลานานเกินไป กรุณาลองใหม่ หรือเปิดเว็บใน Safari/Chrome แทนแอป LINE');
        const ratio = canvas.width / CW, totalH = canvas.height / ratio;
        for (let done = 0; done < totalH - 1; done += CH) {
          const take = Math.min(CH, totalH - done);
          let img = canvas;
          if (totalH > CH + 1) {
            img = document.createElement('canvas'); img.width = canvas.width; img.height = Math.max(1, Math.round(take * ratio));
            img.getContext('2d').drawImage(canvas, 0, Math.round(done * ratio), canvas.width, img.height, 0, 0, canvas.width, img.height);
          }
          if (!first) pdf.addPage(); first = false;
          pdf.addImage(img.toDataURL('image/jpeg', 0.9), 'JPEG', M * k, M * k, CW * k, take * k);
        }
        canvas.width = canvas.height = 0; // คืนหน่วยความจำ
      }
      const total = pdf.getNumberOfPages();
      for (let pg = 1; pg <= total; pg++) { pdf.setPage(pg); pdf.setFontSize(9); pdf.setTextColor(130); pdf.text(`${pg} / ${total}`, (PW - M) * k, (PH - M / 2) * k, { align: 'right' }); }
      const fname = safeName(filename || [title, subtitle].filter(Boolean).join(' ')) + '.pdf';
      ov.set('กำลังบันทึกไฟล์…');
      pdf.save(fname);
      toast('ดาวน์โหลดไฟล์ PDF แล้ว: ' + fname);
    } catch (e) {
      toast(e && e.message ? e.message : 'สร้างไฟล์ PDF ไม่สำเร็จ', true);
    } finally {
      if (ifr) ifr.remove();
      ov.close();
    }
  }

  function rpProfile(u) {
    return GROUPS.map(g => `<h2>${g.t}</h2><table class="rp-kv">${g.f.map(([k, l, o = {}]) => {
      let v = k === 'birth' ? birthText(u) : u[k];
      if (o.type === 'money' && v) v = money(v);
      return `<tr><td>${l}</td><td>${esc(v || '-')}</td></tr>`;
    }).join('')}</table>`).join('');
  }

  function rpRecord(r, n, who) {
    const K = KIND[kindOf(r)];
    const ph = ['photo1', 'photo2'].map((f, i) => r[f] && photoUrl(r[f]) ? `<div class="rp-img" style="background-image:url('${photoUrl(r[f]).replace(/'/g, '%27')}')"></div>` : `<div class="rp-none">ไม่มีรูปที่ ${i + 1}</div>`).join('');
    const row = (l, v) => `<tr><td>${l}</td><td>${esc(v || '-')}</td></tr>`;
    return `<div class="rp-rec"><div class="rp-t">${n}. ${esc(r.title)}</div>
      <div class="rp-m">${who ? `<b>${esc(who)}</b> · ` : ''}${esc(r.type || '')}${K.level && r.level ? ` · ${esc(r.level)}` : ''} · ${esc(thRange(r.startDate, r.endDate))}${K.hours && r.hours ? ` · ${esc(r.hours)} ชั่วโมง` : ''}</div>
      <table class="rp-kv">${K.project ? `<tr><td>ปีงบประมาณ / โครงการ</td><td>${esc(r.year)} · ${esc(r.projectName || '-')}</td></tr>` : row('ปีงบประมาณ', r.year)}
      ${K.level ? row('ระดับรางวัล', r.level) : ''}${row(K.orgLabel, r.organizer)}${row(K.placeLabel, r.place)}${K.audience ? row('กลุ่มผู้เข้าร่วม / จำนวน', r.audience) : ''}
      <tr><td>ผลการตรวจ</td><td>${esc((REVIEW[r.review || ''] || REVIEW[''])[1])}${r.reviewBy ? ` โดย ${esc(r.reviewBy)}` : ''}${r.reviewAt ? ` (${esc(thDate(r.reviewAt, true))})` : ''}${r.reviewNote ? ` — ${esc(r.reviewNote)}` : ''}</td></tr></table>
      ${K.detailReq || r.knowledge ? `<div class="rp-k">${K.detailLabel}</div><p class="rp-p">${esc(r.knowledge || '-')}</p>` : ''}<div class="rp-ph">${ph}</div></div>`;
  }

  const byDate = list => list.slice().sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  function rpSummary(kind, list) {
    if (kind === 'award') return `<span>จำนวน <b>${list.length}</b> รางวัล</span>${AWARD_LEVELS.filter(l => list.some(r => r.level === l)).map(l => `<span>${l} <b>${list.filter(r => r.level === l).length}</b></span>`).join('')}`;
    if (kind === 'speaker') return `<span>จำนวน <b>${list.length}</b> ครั้ง</span><span>รวม <b>${sumHours(list)}</b> ชั่วโมง</span>`;
    return `<span>จำนวน <b>${list.length}</b> รายการ</span><span>รวม <b>${sumHours(list)}</b> ชั่วโมง</span><span>ศึกษาดูงาน <b>${list.filter(r => r.type === 'ศึกษาดูงาน').length}</b> ครั้ง</span>`;
  }

  // kind = ประเภทเดียว (หน้าของครู) · ไม่ระบุ kind + profile = ประวัติพร้อมทุกประเภท (หน้าผู้บริหาร)
  function reportPerson(u, recs, { year, profile, project = '', kind }) {
    const name = fullName(u);
    const kinds = kind ? [kind] : KINDS;
    const build = () => { let body = profile ? rpProfile(u) : `<table class="rp-kv"><tr><td>ชื่อ-สกุล</td><td>${esc(name)}</td></tr><tr><td>ตำแหน่ง</td><td>${esc(u.position || '-')}</td></tr><tr><td>วุฒิการศึกษา / วิชาเอก</td><td>${esc([u.education, u.major].filter(Boolean).join(' / ') || '-')}</td></tr></table>`;
    if (recs) {
      kinds.forEach(k => {
        const sorted = byDate(ofKind(recs, k));
        if (!kind && k !== 'dev' && !sorted.length) return;
        body += `<h2>${k === 'dev' ? 'การพัฒนาตนเอง' : KIND[k].head}${year ? ` ปีงบประมาณ พ.ศ. ${esc(year)}` : ''}</h2>${project && k === 'dev' ? `<table class="rp-kv"><tr><td>โครงการ</td><td>${esc(project)}</td></tr></table>` : ''}
          <div class="rp-sum">${rpSummary(k, sorted)}</div>
          ${sorted.length ? sorted.map((r, i) => rpRecord(r, i + 1)).join('') : '<div class="rp-empty">ยังไม่มีรายการ</div>'}`;
      });
      body += `<div class="rp-sign"><div>ลงชื่อ ..................................................<br>( ${esc(name)} )<br>ผู้รายงาน</div><div>ลงชื่อ ..................................................<br>( .................................................. )<br>ผู้อำนวยการ</div></div>`;
    }
    return body; };
    const K = KIND[kind || 'dev'];
    openReport({
      title: recs ? (profile ? 'ประวัติบุคลากรและผลการปฏิบัติงาน' : K.report) : 'ประวัติส่วนตัวบุคลากร',
      subtitle: name + (year ? ` · ปีงบประมาณ พ.ศ. ${year} (${fyRange(year)})` : ''), build, recs: recs || [],
      filename: [recs ? (profile ? 'ประวัติและผลการปฏิบัติงาน' : K.file) : 'ประวัติส่วนตัว', u.firstName, u.lastName, year, project ? project.slice(0, 40) : ''].filter(Boolean).join(' ')
    });
  }

  function reportStaffList(list) {
    const body = `<table><thead><tr><th class="c">ที่</th><th>ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>วุฒิ / วิชาเอก</th><th>วันเกิด</th><th class="c">อายุ</th><th>เบอร์โทร</th><th class="r">เงินเดือน</th><th>เครื่องราชฯ</th><th>วุฒิลูกเสือ</th></tr></thead><tbody>
      ${list.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${esc(fullName(s))}</td><td>${esc(s.position || '-')}</td><td>${esc([s.education, s.major].filter(Boolean).join(' / ') || '-')}</td>
        <td>${esc([s.birthDay, Number(s.birthMonth) ? TH_MS[Number(s.birthMonth) - 1] : '', s.birthYear].filter(Boolean).join(' ') || '-')}</td><td class="c">${age(s) || '-'}</td><td>${esc(s.phone || '-')}</td>
        <td class="r">${s.salary && !isNaN(Number(s.salary)) ? Number(s.salary).toLocaleString('th-TH') : '-'}</td><td>${esc(s.insignia || '-')}</td><td>${esc(s.scoutQual || '-')}</td></tr>`).join('')}
      </tbody></table>`;
    openReport({ title: 'ทะเบียนข้อมูลบุคลากร', subtitle: `จำนวน ${list.length} คน`, build: () => body, landscape: true, filename: 'ทะเบียนข้อมูลบุคลากร' });
  }

  function reportRecords(list, nameFn, subtitle, kind = 'dev') {
    const K = KIND[kind];
    const by = {}; list.forEach(r => (by[r.staffId] = by[r.staffId] || []).push(r));
    const rows = Object.keys(by).map(id => ({ id, n: nameFn(id), list: by[id] })).sort((a, b) => a.n.localeCompare(b.n, 'th'));
    const build = () => `<h2>สรุปรายบุคคล</h2><div class="rp-sum">${rpSummary(kind, list)}<span>บุคลากร <b>${rows.length}</b> คน</span></div>
      <table><thead><tr><th class="c">ที่</th><th>ชื่อ-สกุล</th><th class="r">จำนวนรายการ</th>${K.hours ? '<th class="r">ชั่วโมง</th>' : ''}</tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.n)}</td><td class="r">${x.list.length}</td>${K.hours ? `<td class="r">${sumHours(x.list)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${K.hours ? 4 : 3}" class="c">ไม่มีรายการ</td></tr>`}
      </tbody></table>
      ${rows.map(x => `<h2>${esc(x.n)}</h2>${byDate(x.list).map((r, i) => rpRecord(r, i + 1)).join('')}`).join('')}`;
    openReport({ title: K.reportAll, subtitle, build, recs: list, filename: K.reportAll + ' ' + (subtitle.match(/\d{4}/) || [''])[0] });
  }

  function viewSettings(v) {
    const sel = S.cache.setYear && S.meta.years.includes(S.cache.setYear) ? S.cache.setYear : S.fy;
    const projs = S.meta.projects.filter(p => p.year === sel);
    v.innerHTML = `<div class="page-head"><div class="grow"><h1>ตั้งค่าปีงบประมาณและโครงการ</h1><div class="muted small">ปีงบประมาณและโครงการที่เพิ่มที่นี่ จะแสดงในดรอปดาวน์ให้ครูเลือกตอนบันทึกการพัฒนาตนเอง</div></div></div>
      <section class="panel"><h3>ปีงบประมาณ</h3>
        <div class="toolbar" style="margin-bottom:1rem"><label class="field" style="max-width:220px"><span>เพิ่มปีงบประมาณ (พ.ศ.)</span><input type="number" id="fy-new" placeholder="เช่น ${Number(S.meta.years[0] || curFY()) + 1}" min="2500" max="2700"></label><button class="btn primary" id="fy-add">เพิ่มปี</button></div>
        <div class="table-wrap"><table><thead><tr><th>ปีงบประมาณ</th><th>ช่วงเวลา</th><th class="r">โครงการ</th><th></th></tr></thead><tbody>
        ${S.meta.years.map(y => `<tr><td><b class="num">พ.ศ. ${y}</b>${y === curFY() ? ' <span class="chip good">ปีปัจจุบัน</span>' : ''}</td><td class="small num">${fyRange(y)}</td><td class="r num">${S.meta.projects.filter(p => p.year === y).length}</td><td class="r"><button class="btn sm danger" data-dely="${y}">ลบ</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">ยังไม่มีปีงบประมาณ</td></tr>'}
        </tbody></table></div></section>
      <section class="panel"><h3>โครงการพัฒนาบุคลากร</h3>
        ${S.meta.years.length ? `<div class="toolbar" style="margin-bottom:1rem">
          <label class="field" style="max-width:240px"><span>ปีงบประมาณ</span>${yearSelect('pj-year', sel)}</label>
          <label class="field" style="flex:3 1 280px"><span>ชื่อโครงการใหม่</span><input type="text" id="pj-name" placeholder="เช่น โครงการศึกษาดูงานแหล่งเรียนรู้ต้นแบบ"></label>
          <button class="btn primary" id="pj-add">เพิ่มโครงการ</button></div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>ชื่อโครงการ (ปีงบประมาณ ${esc(sel)})</th><th></th></tr></thead><tbody>
        ${projs.map((p, i) => `<tr><td class="num muted">${i + 1}</td><td>${esc(p.name)}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-ren="${esc(p.id)}">แก้ชื่อ</button> <button class="btn sm danger" data-delp="${esc(p.id)}">ลบ</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">ยังไม่มีโครงการในปีนี้</td></tr>'}
        </tbody></table></div>` : '<p class="muted" style="margin:0">เพิ่มปีงบประมาณก่อน แล้วจึงเพิ่มโครงการ</p>'}
      </section>
      <section class="panel"><h3>บัญชีผู้ดูแลระบบ</h3>
        <p style="margin:0 0 .8rem">ผู้ดูแลระบบทุกบัญชีเห็นข้อมูลครูทุกคน และจัดการปีงบ โครงการ และบุคลากรได้เท่ากัน เหมาะสำหรับ ผอ. และหัวหน้างานบุคลากร</p>
        <div id="adm-list"><div class="muted small">กำลังโหลด…</div></div>
        <div style="margin-top:.8rem"><button class="btn primary" id="adm-add">+ เพิ่มบัญชีผู้ดูแลระบบ</button></div>
      </section>
      <section class="panel"><h3>นำเข้าข้อมูลบุคลากรและสร้างบัญชีเข้าสู่ระบบ</h3>
        <p style="margin:0 0 .8rem">เลือกไฟล์ <b>staff_import.json</b> ระบบจะบันทึกข้อมูลบุคลากร และสร้างบัญชีให้ทุกคน (ชื่อผู้ใช้ = ชื่อจริง, รหัสผ่าน = เบอร์โทร) ใช้เวลาประมาณ 1 วินาทีต่อคน นำเข้าซ้ำได้ ข้อมูลเดิมที่รหัสตรงกันจะถูกอัปเดต</p>
        <div class="toolbar"><label class="btn primary" for="im-file">เลือกไฟล์ .json และนำเข้า</label><input type="file" id="im-file" accept=".json,application/json" hidden>
          ${FB ? '<button class="btn" id="im-acc">สร้างบัญชีให้คนที่ยังไม่มีบัญชี</button>' : ''}</div>
        <div id="im-out" style="margin-top:.8rem"></div>
      </section>`;
    const drawAdmins = list => {
      const box = $('#adm-list'); if (!box) return;
      box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ชื่อ / ตำแหน่ง</th><th>ชื่อผู้ใช้</th><th>อีเมล (รีเซ็ตรหัสผ่าน)</th><th></th></tr></thead><tbody>
        ${list.map(a => `<tr><td>${esc(a.name)}${a.self ? ' <span class="chip good">คุณ</span>' : ''}</td><td><b>${esc(a.username)}</b></td><td class="small">${esc(a.email || '—')}</td>
          <td class="r">${a.self ? '' : `<button class="btn sm danger" data-deladm="${esc(a.uid)}">ลบ</button>`}</td></tr>`).join('')}
        </tbody></table></div>`;
      $$('[data-deladm]', box).forEach(b => b.onclick = async () => {
        const a = list.find(x => x.uid === b.dataset.deladm);
        if (!(await confirmBox(`ลบบัญชีผู้ดูแล “${a.name}” (ชื่อผู้ใช้ ${a.username})? บัญชีนี้จะเข้าระบบไม่ได้อีก`, 'ลบบัญชี'))) return;
        try { drawAdmins(await busy(() => api('deleteAdmin', { uid: a.uid }))); toast('ลบบัญชีแล้ว'); } catch (e) { }
      });
    };
    api('listAdmins').then(drawAdmins).catch(e => { const box = $('#adm-list'); if (box) box.innerHTML = `<div class="chip bad">${esc(e.message)}</div>`; });
    $('#adm-add').onclick = () => {
      const m = modal({
        title: 'เพิ่มบัญชีผู้ดูแลระบบ',
        body: `<div class="grid">
          <label class="field wide"><span>ชื่อ-สกุล / ตำแหน่ง</span><input type="text" id="na-name" placeholder="เช่น นายสมศักดิ์ ใจดี (ผู้อำนวยการ)"></label>
          <label class="field"><span>ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ ไม่มีเว้นวรรค)</span><input type="text" id="na-user" placeholder="เช่น director หรือ ผอ"></label>
          <label class="field"><span>อีเมล (ใช้รีเซ็ตรหัสผ่าน)</span><input type="email" id="na-email" placeholder="name@gmail.com"></label>
          <label class="field"><span>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</span><input type="password" id="na-pass" autocomplete="new-password"></label>
          <label class="field"><span>ยืนยันรหัสผ่าน</span><input type="password" id="na-pass2" autocomplete="new-password"></label>
        </div><p class="small muted" style="margin:0">แจ้งชื่อผู้ใช้และรหัสผ่านให้เจ้าของบัญชี เขาเปลี่ยนรหัสผ่านเองได้ที่เมนู “เปลี่ยนรหัสผ่าน”</p>`,
        foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn primary" id="na-ok">สร้างบัญชี</button>`
      });
      $('#na-ok', m.el).onclick = async () => {
        if ($('#na-pass', m.el).value !== $('#na-pass2', m.el).value) return toast('รหัสผ่านทั้งสองช่องไม่ตรงกัน', true);
        try {
          const list = await busy(() => api('addAdmin', { name: $('#na-name', m.el).value, username: $('#na-user', m.el).value, email: $('#na-email', m.el).value, password: $('#na-pass', m.el).value }));
          m.close(); drawAdmins(list); toast('สร้างบัญชีผู้ดูแลระบบแล้ว');
        } catch (e) { }
      };
    };
    const showImport = d => {
      $('#im-out').innerHTML = `<div class="notice info"><div class="grow">${d.added !== undefined ? `เพิ่มใหม่ ${d.added} คน · อัปเดต ${d.updated} คน · ` : ''}สร้างบัญชีสำเร็จ ${d.created || 0} คน${d.pending ? ` · ยังไม่มีบัญชี ${d.pending} คน` : ''}
        ${d.warnings && d.warnings.length ? `<ul style="margin:.5rem 0 0;padding-left:1.2rem">${d.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div></div>`;
      S.cache = {};
    };
    $('#im-file').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      let list;
      try { list = JSON.parse(await f.text()); if (!Array.isArray(list)) throw 0; } catch (err) { return toast('ไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์ staff_import.json', true); }
      try { showImport(await busy(() => api('importStaff', { list }))); toast('นำเข้าเรียบร้อย'); } catch (err) { }
    };
    const ia = $('#im-acc'); if (ia) ia.onclick = async () => { try { showImport(await busy(() => api('createAccounts'))); } catch (err) { } };
    const upd = meta => { S.meta = meta; viewSettings(v); };
    $('#fy-add').onclick = async () => { const y = $('#fy-new').value.trim(); if (!y) return toast('กรอกปี พ.ศ. ก่อน', true); try { upd(await busy(() => api('addYear', { year: y }))); toast('เพิ่มปีงบประมาณ ' + y + ' แล้ว'); } catch (e) { } };
    $$('[data-dely]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox(`ลบปีงบประมาณ ${b.dataset.dely} และโครงการทั้งหมดในปีนี้?`, 'ลบปี'))) return;
      try { upd(await busy(() => api('deleteYear', { year: b.dataset.dely }))); if (!S.meta.years.includes(S.fy)) S.fy = S.meta.years[0]; toast('ลบแล้ว'); } catch (e) { }
    });
    const py = $('#pj-year'); if (py) py.onchange = e => { S.cache.setYear = e.target.value; viewSettings(v); };
    const pa = $('#pj-add'); if (pa) pa.onclick = async () => {
      const name = $('#pj-name').value.trim(); if (!name) return toast('กรอกชื่อโครงการก่อน', true);
      S.cache.setYear = $('#pj-year').value;
      try { upd(await busy(() => api('addProject', { year: S.cache.setYear, name }))); toast('เพิ่มโครงการแล้ว'); } catch (e) { }
    };
    $$('[data-delp]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('ลบโครงการนี้?', 'ลบโครงการ'))) return;
      try { upd(await busy(() => api('deleteProject', { id: b.dataset.delp }))); toast('ลบโครงการแล้ว'); } catch (e) { }
    });
    $$('[data-ren]').forEach(b => b.onclick = () => {
      const p = S.meta.projects.find(x => x.id === b.dataset.ren);
      const m = modal({ title: 'แก้ชื่อโครงการ', size: 'sm', body: `<label class="field"><span>ชื่อโครงการ</span><input type="text" id="rn-name" value="${esc(p.name)}"></label>`, foot: `<button class="btn" data-close>ยกเลิก</button><button class="btn primary" id="rn-ok">บันทึก</button>` });
      $('#rn-ok', m.el).onclick = async () => { try { const meta = await busy(() => api('renameProject', { id: p.id, name: $('#rn-name', m.el).value })); m.close(); upd(meta); toast('แก้ชื่อแล้ว'); } catch (e) { } };
    });
  }

  /* ---------------- demo backend (localStorage) ---------------- */
  const Demo = (() => {
    const KEY = 'hr_demo_v1';
    const seed = () => ({
      admin: { user: 'admin', pass: 'admin1234' },
      years: ['2570'],
      projects: [
        { id: 'P1', year: '2570', name: 'โครงการพัฒนาศักยภาพบุคลากร ประจำปีงบประมาณ 2570' },
        { id: 'P2', year: '2570', name: 'โครงการศึกษาดูงานแหล่งเรียนรู้ต้นแบบ' },
        { id: 'P3', year: '2570', name: 'โครงการอบรมการจัดการเรียนรู้ด้วยเทคโนโลยีดิจิทัล' }
      ],
      staff: [
        { id: 'S001', prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี (ตัวอย่าง)', position: 'ครู กศน.ตำบล', citizenId: '0000000000001', address: '12 ม.3 ต.ตัวอย่าง อ.ตัวอย่าง จ.เชียงราย', phone: '0811111111', birthDay: '5', birthMonth: '6', birthYear: '2530', email: 'somchai@example.com', education: 'ปริญญาตรี', major: 'สังคมศึกษา', scoutQual: 'B.T.C', scoutType: 'วิสามัญ', scoutPosition: 'ผู้กำกับ', scoutFee: 'ตลอดชีพ', redCrossQual: 'วิทยากรยุวกาชาด', redCrossDate: '15-18 มีนาคม 2564', salary: '21000', insignia: '', role: '' },
        { id: 'S002', prefix: 'นางสาว', firstName: 'มาลี', lastName: 'ศรีสุข (ตัวอย่าง)', position: 'ครูผู้ช่วย', citizenId: '0000000000002', address: '45 ม.7 ต.ตัวอย่าง อ.ตัวอย่าง จ.เชียงราย', phone: '0822222222', birthDay: '21', birthMonth: '10', birthYear: '2535', email: 'malee@example.com', education: 'ปริญญาโท', major: 'การบริหารการศึกษา', salary: '24500', role: '' },
        { id: 'S003', prefix: 'นาง', firstName: 'วรรณา', lastName: 'บุญมา (ตัวอย่าง)', position: 'ครู กศน.ตำบล', citizenId: '0000000000003', address: '9 ม.1 ต.ตัวอย่าง อ.ตัวอย่าง จ.เชียงราย', phone: '0833333333', birthDay: '2', birthMonth: '1', birthYear: '2522', email: '', education: 'ปริญญาตรี', major: 'การศึกษานอกระบบ', salary: '31000', insignia: 'จ.ม.', role: '' }
      ].map(s => Object.assign({ pw: '', pwChanged: false }, s)),
      records: [
        { id: 'R1', staffId: 'S001', year: '2570', projectId: 'P2', projectName: 'โครงการศึกษาดูงานแหล่งเรียนรู้ต้นแบบ', type: 'ศึกษาดูงาน', title: 'ศึกษาดูงานศูนย์เรียนรู้เศรษฐกิจพอเพียง (ตัวอย่าง)', place: 'ศูนย์เรียนรู้ ต.ตัวอย่าง', organizer: 'สกร.ระดับอำเภอ', startDate: '2026-10-02', endDate: '2026-10-03', hours: '12', knowledge: 'เรียนรู้การจัดการแปลงเกษตรผสมผสานและการทำบัญชีครัวเรือน นำไปปรับใช้ในการจัดกิจกรรมการศึกษาต่อเนื่องให้ผู้เรียนในตำบล', photo1: '', photo2: '' },
        { id: 'R2', kind: 'award', staffId: 'S001', year: '2570', projectId: '', projectName: '', type: 'เกียรติบัตร', level: 'ระดับจังหวัด', title: 'ครู กศน.ตำบลดีเด่น (ตัวอย่าง)', place: 'หอประชุมจังหวัด', organizer: 'สกร.จังหวัด', startDate: '2026-11-16', endDate: '', hours: '', knowledge: '', photo1: '', photo2: '' },
        { id: 'R3', kind: 'speaker', staffId: 'S002', year: '2570', projectId: '', projectName: '', type: 'บรรยาย', title: 'การทำบัญชีครัวเรือน (ตัวอย่าง)', place: 'ศาลาอเนกประสงค์ ม.4', organizer: 'องค์การบริหารส่วนตำบล', audience: 'ผู้สูงอายุ 30 คน', startDate: '2026-12-05', endDate: '', hours: '3', knowledge: 'บรรยายและฝึกปฏิบัติการบันทึกรายรับรายจ่าย', photo1: '', photo2: '' }
      ]
    });
    let db;
    const load = () => { if (db) return db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { } return db = db || seed(); };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { throw new Error('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม (โหมดทดลอง)'); } };
    const sessions = {};
    const pub = s => { const o = Object.assign({}, s); delete o.pw; o.pwChanged = !!s.pwChanged; o.canChangePassword = !s.pwChanged; return o; };
    const meta = () => ({ years: db.years.slice().sort((a, b) => b - a), projects: db.projects.slice() });
    const digits = s => String(s || '').replace(/\D/g, '').replace(/^0+/, '');
    const me = ses => ses.id === 'ADMIN' ? { role: 'admin', user: { id: 'ADMIN', prefix: '', firstName: ses.name || 'ผู้ดูแลระบบ', lastName: ses.name ? '' : '(ทดลอง)', isAdminAccount: true, canChangePassword: true } } : { role: ses.role, user: pub(db.staff.find(s => s.id === ses.id)) };
    const TEDIT = ['prefix', 'firstName', 'lastName', 'position', 'citizenId', 'phone', 'email', 'address', 'birthDay', 'birthMonth', 'birthYear', 'education', 'major', 'scoutQual', 'scoutType', 'scoutPosition', 'scoutFee', 'redCrossQual', 'redCrossDate', 'salary', 'insignia'];
    async function handle(q) {
      load(); await new Promise(r => setTimeout(r, 120));
      const ok = data => ({ ok: true, data }), err = e => ({ ok: false, error: e });
      if (q.action === 'setupStatus') return ok({ done: true });
      if (q.action === 'forgotPassword') return err('โหมดทดลองไม่ส่งอีเมล ในระบบจริงจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของครู');
      if (q.action === 'login') {
        const u = String(q.username || '').replace(/\s+/g, ''), p = String(q.password || '').trim();
        const xa = (db.admins || []).find(a => a.username === u);
        if (xa) { if (p !== xa.pass) return err('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); const t = 'T' + Math.random(); sessions[t] = { id: 'ADMIN', role: 'admin', name: xa.name }; return ok(Object.assign({ token: t }, me(sessions[t]))); }
        if (u.toLowerCase() === db.admin.user) { if (p !== db.admin.pass) return err('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); const t = 'T' + Math.random(); sessions[t] = { id: 'ADMIN', role: 'admin' }; return ok(Object.assign({ token: t }, me(sessions[t]))); }
        const s = db.staff.find(s => s.firstName.replace(/\s+/g, '') === u.replace(/^(นางสาว|น\.ส\.|นาย|นาง)/, '')) || db.staff.find(s => s.firstName === u);
        if (!s || !(s.pw ? p === s.pw : digits(p) && digits(p) === digits(s.phone))) return err('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        const t = 'T' + Math.random(); sessions[t] = { id: s.id, role: s.role === 'admin' ? 'admin' : 'teacher' }; return ok(Object.assign({ token: t }, me(sessions[t])));
      }
      let ses = sessions[q.token];
      if (!ses) { try { const keep = JSON.parse(sessionStorage.getItem('hr_demo_ses') || '{}'); ses = keep[q.token]; if (ses) sessions[q.token] = ses; } catch (e) { } }
      if (!ses) return err('SESSION');
      try { const keep = {}; keep[q.token] = ses; sessionStorage.setItem('hr_demo_ses', JSON.stringify(keep)); } catch (e) { }
      const isAdmin = ses.role === 'admin';
      const staff = id => db.staff.find(s => s.id === id);
      try {
        switch (q.action) {
          case 'logout': delete sessions[q.token]; return ok(true);
          case 'getPhotos': return ok({ p1: '', p2: '' });
          case 'me': return ok(me(ses));
          case 'meta': return ok(meta());
          case 'changePassword': {
            if (ses.id === 'ADMIN') { if (q.oldPassword !== db.admin.pass) return err('รหัสผ่านเดิมไม่ถูกต้อง'); db.admin.pass = q.newPassword; save(); return ok(true); }
            const s = staff(ses.id); if (s.pwChanged) return err('คุณใช้สิทธิ์เปลี่ยนรหัสผ่านไปแล้ว');
            if (!(s.pw ? q.oldPassword === s.pw : digits(q.oldPassword) === digits(s.phone))) return err('รหัสผ่านเดิมไม่ถูกต้อง');
            if (String(q.newPassword).length < 6) return err('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
            s.pw = q.newPassword; s.pwChanged = true; save(); return ok(pub(s));
          }
          case 'updateProfile': {
            const d = q.data || {}; let s;
            if (isAdmin && !d.id) { if (db.staff.some(x => x.firstName === d.firstName)) return err('มีชื่อนี้ในระบบแล้ว'); s = { id: 'S' + String(Date.now()).slice(-5), pw: '', pwChanged: false }; db.staff.push(s); }
            else s = staff(isAdmin ? d.id : ses.id);
            if (!s.pw && d.phone !== undefined && digits(d.phone) !== digits(s.phone) && s.phone) s.pw = s.phone;
            Object.keys(d).forEach(k => { if (k !== 'id' && (isAdmin || TEDIT.includes(k))) s[k] = String(d[k]).trim(); });
            save(); return ok(pub(s));
          }
          case 'listRecords': {
            let r = db.records.slice();
            if (!isAdmin || q.mine) r = r.filter(x => x.staffId === ses.id); else if (q.staffId) r = r.filter(x => x.staffId === q.staffId);
            if (q.year) r = r.filter(x => x.year === q.year);
            return ok(r.map(x => Object.assign({ kind: kindOf(x) }, x)).sort((a, b) => b.startDate.localeCompare(a.startDate)));
          }
          case 'saveRecord': {
            const d = q.record; let r = d.id ? db.records.find(x => x.id === d.id) : null;
            if (d.id && !r) return err('ไม่พบรายการ');
            if (r && r.staffId !== ses.id) return err('แก้ไขได้เฉพาะรายการของตนเอง');
            if (!r) { if (ses.id === 'ADMIN') return err('บัญชีผู้ดูแลไม่สามารถบันทึกรายการของตนเองได้'); r = { id: 'R' + Date.now(), staffId: ses.id }; db.records.push(r); }
            Object.assign(r, { review: '', reviewNote: '', reviewBy: '', reviewAt: '' });
            const kind = kindOf(d);
            if (r.kind && kindOf(r) !== kind) return err('เปลี่ยนประเภทรายการไม่ได้');
            ['year', 'projectId', 'type', 'title', 'place', 'organizer', 'level', 'audience', 'startDate', 'endDate', 'hours', 'knowledge'].forEach(k => r[k] = d[k] || '');
            r.kind = kind;
            const p = kind === 'dev' ? db.projects.find(x => x.id === d.projectId) : null;
            if (kind !== 'dev') r.projectId = '';
            r.projectName = kind !== 'dev' ? '' : p ? p.name : 'อื่น ๆ (นอกโครงการ)';
            (q.photos || []).forEach((ph, i) => { if (ph === 'keep') return; r['photo' + (i + 1)] = ph && ph.data ? ph.data : ''; });
            save(); return ok(r);
          }
          case 'deleteRecord': { const r = db.records.find(x => x.id === q.id); if (!r || r.staffId !== ses.id) return err('ลบได้เฉพาะรายการของตนเอง'); db.records = db.records.filter(x => x !== r); save(); return ok(true); }
        }
        if (!isAdmin) return err('สำหรับผู้บริหาร/ผู้ดูแลระบบเท่านั้น');
        switch (q.action) {
          case 'listStaff': return ok(db.staff.map(pub));
          case 'reviewRecord': {
            const r = db.records.find(x => x.id === q.id); if (!r) return err('ไม่พบรายการ');
            if (r.staffId === ses.id) return err('ตรวจรายการของตนเองไม่ได้');
            if (q.status === 'revise' && !String(q.note || '').trim()) return err('กรุณาเขียนสิ่งที่ต้องแก้ไข');
            const st = staff(ses.id); const by = st ? fullName(st) : (ses.name || 'ผู้ดูแลระบบ (ทดลอง)');
            Object.assign(r, q.status ? { review: q.status, reviewNote: String(q.note || '').trim(), reviewBy: by, reviewAt: new Date().toISOString().slice(0, 19) } : { review: '', reviewNote: '', reviewBy: '', reviewAt: '' });
            save(); return ok(r);
          }
          case 'createAccounts': return ok({ created: 0, pending: 0, warnings: [] });
          case 'listAdmins': return ok([{ uid: 'ADMIN', name: 'ผู้ดูแลระบบ (บัญชีแรก)', username: db.admin.user, email: '', self: ses.id === 'ADMIN' }].concat((db.admins || []).map(a => ({ uid: a.uid, name: a.name, username: a.username, email: a.email, self: false }))));
          case 'addAdmin': {
            const u = String(q.username || '').trim();
            if (!q.name || !u) return err('กรุณากรอกชื่อและชื่อผู้ใช้');
            if (String(q.password || '').length < 6) return err('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            if (u === db.admin.user || db.staff.some(s => s.firstName === u) || (db.admins || []).some(a => a.username === u)) return err('ชื่อผู้ใช้นี้มีในระบบแล้ว');
            (db.admins = db.admins || []).push({ uid: 'A' + Date.now(), name: q.name, username: u, email: q.email, pass: q.password }); save();
            return handle({ action: 'listAdmins', token: q.token });
          }
          case 'deleteAdmin': db.admins = (db.admins || []).filter(a => a.uid !== q.uid); save(); return handle({ action: 'listAdmins', token: q.token });
          case 'importStaff': {
            let added = 0, updated = 0;
            (q.list || []).forEach(src => { if (!src.id || !src.firstName) return; const s = staff(src.id); if (s) { Object.assign(s, src); updated++; } else { db.staff.push(Object.assign({ pw: '', pwChanged: false }, src)); added++; } });
            save(); return ok({ added, updated, created: added, warnings: ['โหมดทดลอง: ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น'] });
          }
          case 'deleteStaff': db.staff = db.staff.filter(s => s.id !== q.id); db.records = db.records.filter(r => r.staffId !== q.id); save(); return ok(true);
          case 'resetPassword': { const s = staff(q.id); s.pw = ''; s.pwChanged = false; save(); return ok(pub(s)); }
          case 'addYear': { const y = String(q.year); if (!/^25\d\d$/.test(y)) return err('ปีงบประมาณต้องเป็น พ.ศ. 4 หลัก เช่น 2571'); if (db.years.includes(y)) return err('มีปีงบประมาณนี้แล้ว'); db.years.push(y); save(); return ok(meta()); }
          case 'deleteYear': if (db.records.some(r => r.year === q.year)) return err('ลบไม่ได้ มีรายการพัฒนาตนเองในปีนี้อยู่'); db.years = db.years.filter(y => y !== q.year); db.projects = db.projects.filter(p => p.year !== q.year); save(); return ok(meta());
          case 'addProject': db.projects.push({ id: 'P' + Date.now().toString(36), year: q.year, name: q.name }); save(); return ok(meta());
          case 'renameProject': { const p = db.projects.find(x => x.id === q.id); p.name = q.name; db.records.filter(r => r.projectId === p.id).forEach(r => r.projectName = p.name); save(); return ok(meta()); }
          case 'deleteProject': if (db.records.some(r => r.projectId === q.id)) return err('ลบไม่ได้ มีครูบันทึกรายการในโครงการนี้แล้ว'); db.projects = db.projects.filter(p => p.id !== q.id); save(); return ok(meta());
        }
        return err('ไม่รู้จักคำสั่ง');
      } catch (e) { return err(e.message); }
    }
    return { handle };
  })();

  /* ---------------- boot ---------------- */
  (async function boot() {
    app.innerHTML = '<div class="login-wrap"><div class="spinner" role="status" aria-label="กำลังโหลด"></div></div>';
    if (FB) {
      // ตรวจว่าติดตั้งแล้วหรือยัง เฉพาะครั้งแรกบนเครื่องนี้ (ลดการรอ 1 รอบ)
      if (!lstore.get('hr_setup_done')) {
        try { const st = await api('setupStatus'); if (!st.done) return renderSetup(); lstore.set('hr_setup_done', '1'); }
        catch (e) { return renderLogin(e.message); }
      }
    }
    if (S.token || FB) {
      try { const d = await api('me'); await enter(d); return; } catch (e) { S.token = null; store.set('hr_token', null); }
    }
    renderLogin();
  })();
})();
