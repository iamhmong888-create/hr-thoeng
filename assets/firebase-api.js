/* ระบบงานบุคลากร — Firebase backend (Firestore + Firebase Auth, แผน Spark ฟรี)
 * ทุกคำสั่งรับ/คืนค่าในรูปแบบเดียวกับโหมดทดลอง: handle({action, ...}) → {ok, data} | {ok:false, error}
 */
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword,
  sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, getDocs, setDoc, updateDoc,
  collection, query, where, limit, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const STAFF_FIELDS = ['id', 'prefix', 'firstName', 'lastName', 'position', 'citizenId', 'address', 'phone',
  'birthDay', 'birthMonth', 'birthYear', 'email', 'education', 'major', 'scoutQual', 'scoutType', 'scoutPosition',
  'scoutFee', 'redCrossQual', 'redCrossDate', 'salary', 'insignia', 'role'];
const TEACHER_EDITABLE = ['prefix', 'phone', 'email', 'address', 'birthDay', 'birthMonth', 'birthYear', 'education', 'major',
  'scoutQual', 'scoutType', 'scoutPosition', 'scoutFee', 'redCrossQual', 'redCrossDate', 'insignia'];
const ADMIN_EDITABLE = STAFF_FIELDS.filter(k => k !== 'id');
const REC_FIELDS = ['year', 'projectId', 'type', 'title', 'place', 'organizer', 'startDate', 'endDate', 'hours', 'knowledge'];
const NO_EMAIL_DOMAIN = 'no-email.local';
const PREFIXES = ['นางสาว', 'น.ส.', 'นาย', 'นาง', 'ครู'];

const nameKey = n => String(n || '').replace(/\s+/g, '').toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e || '').trim());
const isSynthetic = e => String(e || '').endsWith('@' + NO_EMAIL_DOMAIN);
const phonePw = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 9 && d[0] !== '0') d = '0' + d; return d; };
const nowISO = () => new Date().toISOString().slice(0, 19);
const mask = e => { const [a, b] = String(e).split('@'); return (a.length <= 2 ? a[0] + '*' : a.slice(0, 2) + '*'.repeat(Math.min(6, a.length - 2))) + '@' + b; };

function authMsg(e) {
  const c = e && e.code || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  if (/too-many-requests/.test(c)) return 'เข้าสู่ระบบผิดหลายครั้ง ระบบล็อกชั่วคราว กรุณารอสักครู่แล้วลองใหม่';
  if (/network-request-failed|unavailable/.test(c)) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้';
  if (/weak-password/.test(c)) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (/email-already-in-use/.test(c)) return 'อีเมลนี้มีบัญชีในระบบแล้ว';
  if (/invalid-email/.test(c)) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (/permission-denied/.test(c)) return 'ไม่มีสิทธิ์ทำรายการนี้';
  if (/requires-recent-login/.test(c)) return 'กรุณาออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยนรหัสผ่าน';
  return e && e.message || String(e);
}

export function create(CFG) {
  const app = initializeApp(CFG.FIREBASE);
  const auth = getAuth(app);
  auth.languageCode = 'th';
  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch (e) { db = initializeFirestore(app, {}); }
  const D = (...p) => doc(db, ...p);
  const C = name => collection(db, name);
  const authReady = new Promise(res => { const un = onAuthStateChanged(auth, () => { un(); res(); }); });
  let ctx = null;

  async function me() {
    await authReady;
    const u = auth.currentUser;
    if (!u) throw new Error('SESSION');
    if (!ctx || ctx.uid !== u.uid) {
      const s = await getDoc(D('users', u.uid));
      if (!s.exists()) { await signOut(auth); throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ'); }
      const d = s.data();
      ctx = { uid: u.uid, email: u.email, staffId: d.staffId || '', role: d.role === 'admin' ? 'admin' : 'teacher', name: d.name || '', username: d.username || '' };
    }
    return ctx;
  }
  const needAdmin = c => { if (c.role !== 'admin') throw new Error('สำหรับผู้บริหาร/ผู้ดูแลระบบเท่านั้น'); };

  function pub(s) {
    const o = {};
    STAFF_FIELDS.forEach(k => o[k] = s[k] === undefined || s[k] === null ? '' : String(s[k]));
    o.pwChanged = !!s.pwChanged;
    o.canChangePassword = !s.pwChanged;
    o.hasAccount = !!s.uid;
    o.loginEmail = s.authEmail && !isSynthetic(s.authEmail) ? s.authEmail : '';
    return o;
  }
  async function getStaff(id) {
    const s = await getDoc(D('staff', id));
    if (!s.exists()) throw new Error('ไม่พบบุคลากร');
    return s.data();
  }
  async function meResult(c) {
    if (!c.staffId) return { role: 'admin', user: { id: 'ADMIN', uid: c.uid, prefix: '', firstName: c.name || 'ผู้ดูแลระบบ', lastName: '', username: c.username || 'admin', isAdminAccount: true, canChangePassword: true } };
    return { role: c.role, user: pub(await getStaff(c.staffId)) };
  }

  async function findLogin(raw) {
    let key = nameKey(raw);
    if (!key) return null;
    let s = await getDoc(D('logins', key));
    if (s.exists()) return s.data();
    const p = PREFIXES.find(p => key.indexOf(p) === 0);
    if (p) { s = await getDoc(D('logins', key.slice(p.length))); if (s.exists()) return s.data(); }
    return null;
  }

  async function getMeta() {
    const s = await getDoc(D('config', 'meta'));
    const m = s.exists() ? s.data() : {};
    return {
      years: (m.years || []).map(String).sort((a, b) => Number(b) - Number(a)),
      projects: (m.projects || []).map(p => ({ id: String(p.id), year: String(p.year), name: String(p.name) }))
    };
  }
  async function saveMeta(m) { await setDoc(D('config', 'meta'), { years: m.years, projects: m.projects }); return getMeta(); }

  /* สร้างบัญชี Firebase Auth ให้บุคลากร (ใช้แอปสำรอง เพื่อไม่ให้ผู้ดูแลหลุดจากระบบ) */
  async function createAccount(s) {
    const pw = phonePw(s.phone);
    const who = [s.firstName, s.lastName].join(' ');
    if (pw.length < 6) throw new Error(`${who}: ไม่มีเบอร์โทรศัพท์ที่ใช้เป็นรหัสผ่านเริ่มต้นได้`);
    const sec = initializeApp(CFG.FIREBASE, 'sec' + Date.now() + Math.random());
    const tryCreate = async email => (await createUserWithEmailAndPassword(getAuth(sec), email, pw)).user.uid;
    let warn = '';
    try {
      let email = String(s.email || '').trim().toLowerCase();
      if (validEmail(email)) {
        try { return { uid: await tryCreate(email), email, warn }; }
        catch (e) { if (!/email-already-in-use|invalid-email/.test(e.code || '')) throw e; warn = `${who}: อีเมล ${email} ใช้สร้างบัญชีไม่ได้ (${authMsg(e)})`; }
      } else warn = `${who}: ไม่มีอีเมลที่ถูกต้อง`;
      email = `${String(s.id).toLowerCase()}.${Date.now().toString(36)}@${NO_EMAIL_DOMAIN}`;
      return { uid: await tryCreate(email), email, warn: warn + ' → สร้างบัญชีแบบไม่มีอีเมล (เข้าระบบได้ แต่รีเซ็ตรหัสผ่านทางอีเมลไม่ได้)' };
    } catch (e) {
      throw new Error(`${who}: ${authMsg(e)}`);
    } finally { deleteApp(sec).catch(() => { }); }
  }
  function linkAccount(b, s, acc) {
    b.set(D('users', acc.uid), { staffId: s.id, role: s.role === 'admin' ? 'admin' : 'teacher' });
    b.set(D('logins', nameKey(s.firstName)), { email: acc.email });
    b.set(D('staff', s.id), { uid: acc.uid, authEmail: acc.email, pwChanged: false }, { merge: true });
  }
  async function createMissingAccounts() {
    const all = (await getDocs(C('staff'))).docs.map(d => d.data()).filter(s => !s.uid).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    let created = 0; const warnings = [];
    for (const s of all) {
      try {
        const acc = await createAccount(s);
        const b = writeBatch(db); linkAccount(b, s, acc); await b.commit();
        created++; if (acc.warn) warnings.push(acc.warn);
      } catch (e) { warnings.push(e.message); }
    }
    return { created, pending: all.length - created, warnings };
  }

  function recOut(id, r) {
    const o = { id };
    ['staffId', ...REC_FIELDS, 'projectName', 'createdAt', 'updatedAt'].forEach(k => o[k] = r[k] === undefined ? '' : String(r[k]));
    o.photo1 = r.hasPhoto1 ? `fs:${id}:1` : '';
    o.photo2 = r.hasPhoto2 ? `fs:${id}:2` : '';
    return o;
  }

  const actions = {
    async setupStatus() { const s = await getDoc(D('config', 'setup')); return { done: s.exists() }; },

    async setupAdmin(q) {
      if ((await getDoc(D('config', 'setup'))).exists()) throw new Error('ระบบติดตั้งแล้ว');
      const email = String(q.email || '').trim().toLowerCase();
      if (!validEmail(email)) throw new Error('กรุณากรอกอีเมลที่ถูกต้อง');
      if (String(q.password || '').length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      let cred;
      try { cred = await createUserWithEmailAndPassword(auth, email, q.password); }
      catch (e) { throw new Error(authMsg(e)); }
      const b = writeBatch(db);
      b.set(D('users', cred.user.uid), { staffId: '', role: 'admin' });
      b.set(D('logins', 'admin'), { email });
      b.set(D('config', 'meta'), { years: ['2570'], projects: [] });
      b.set(D('config', 'setup'), { createdAt: nowISO(), adminEmail: email });
      await b.commit();
      ctx = null;
      return meResult(await me());
    },

    async login(q) {
      const pw = String(q.password || '').trim();
      if (!q.username || !pw) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      const L = await findLogin(q.username);
      if (!L) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      try { await signInWithEmailAndPassword(auth, L.email, pw); }
      catch (e) {
        const digits = pw.replace(/\D/g, '');
        if (digits && digits !== pw && /invalid-credential|wrong-password/.test(e.code || '')) {
          try { await signInWithEmailAndPassword(auth, L.email, digits); } catch (e2) { throw new Error(authMsg(e2)); }
        } else throw new Error(authMsg(e));
      }
      ctx = null;
      return Object.assign({ token: 'firebase' }, await meResult(await me()));
    },

    async forgotPassword(q) {
      const L = await findLogin(q.username);
      if (!L) throw new Error('ไม่พบชื่อผู้ใช้นี้');
      if (isSynthetic(L.email)) throw new Error('บัญชีนี้ไม่มีอีเมล กรุณาติดต่อผู้ดูแลระบบ');
      try { await sendPasswordResetEmail(auth, L.email); } catch (e) { throw new Error(authMsg(e)); }
      return { sentTo: mask(L.email) };
    },

    async logout() { ctx = null; await signOut(auth); return true; },
    async me() { return meResult(await me()); },
    async meta() { await me(); return getMeta(); },

    async changePassword(q) {
      const c = await me();
      const np = String(q.newPassword || '');
      if (np.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      let s = null;
      if (c.staffId) { s = await getStaff(c.staffId); if (s.pwChanged) throw new Error('คุณใช้สิทธิ์เปลี่ยนรหัสผ่านไปแล้ว (เปลี่ยนได้ 1 ครั้ง) หากลืมรหัสผ่านให้ใช้ “ลืมรหัสผ่าน” ที่หน้าเข้าสู่ระบบ'); }
      const user = auth.currentUser;
      try { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, String(q.oldPassword || '').trim())); }
      catch (e) { throw new Error(/too-many/.test(e.code || '') ? authMsg(e) : 'รหัสผ่านเดิมไม่ถูกต้อง'); }
      try { await updatePassword(user, np); } catch (e) { throw new Error(authMsg(e)); }
      if (s) { await updateDoc(D('staff', s.id), { pwChanged: true, updatedAt: nowISO() }); return pub(Object.assign(s, { pwChanged: true })); }
      return true;
    },

    async updateProfile(q) {
      const c = await me();
      const d = q.data || {};
      const isAdmin = c.role === 'admin';
      if (!isAdmin) {
        if (d.id && d.id !== c.staffId) throw new Error('ไม่มีสิทธิ์แก้ไขข้อมูลผู้อื่น');
        const up = { updatedAt: nowISO() };
        TEACHER_EDITABLE.forEach(k => { if (d[k] !== undefined) up[k] = String(d[k]).trim(); });
        await updateDoc(D('staff', c.staffId), up);
        return pub(await getStaff(c.staffId));
      }
      if (!d.id) {
        const fn = String(d.firstName || '').trim();
        if (!fn) throw new Error('กรุณากรอกชื่อ');
        if (await findLogin(fn)) throw new Error('มีชื่อนี้ในระบบแล้ว (ชื่อใช้เป็นชื่อผู้ใช้ ต้องไม่ซ้ำ)');
        const ids = (await getDocs(C('staff'))).docs.map(x => Number(String(x.id).replace(/\D/g, '')) || 0);
        const s = { id: 'S' + String(Math.max(0, ...ids) + 1).padStart(3, '0'), pwChanged: false, updatedAt: nowISO() };
        ADMIN_EDITABLE.forEach(k => s[k] = d[k] === undefined ? '' : String(d[k]).trim());
        await setDoc(D('staff', s.id), s);
        let warn = '';
        try { const acc = await createAccount(s); const b = writeBatch(db); linkAccount(b, s, acc); await b.commit(); warn = acc.warn; }
        catch (e) { warn = e.message + ' (บันทึกข้อมูลแล้ว แต่ยังไม่มีบัญชีเข้าสู่ระบบ)'; }
        return Object.assign(pub(await getStaff(s.id)), warn ? { _warn: warn } : {});
      }
      const old = await getStaff(d.id);
      const up = { updatedAt: nowISO() };
      ADMIN_EDITABLE.forEach(k => { if (d[k] !== undefined) up[k] = String(d[k]).trim(); });
      const b = writeBatch(db);
      if (up.firstName !== undefined && nameKey(up.firstName) !== nameKey(old.firstName)) {
        if (!up.firstName) throw new Error('กรุณากรอกชื่อ');
        if (await findLogin(up.firstName)) throw new Error('มีชื่อนี้ในระบบแล้ว');
        if (old.uid) { b.delete(D('logins', nameKey(old.firstName))); b.set(D('logins', nameKey(up.firstName)), { email: old.authEmail }); }
      }
      if (old.uid && up.role !== undefined && up.role !== (old.role || '')) b.update(D('users', old.uid), { role: up.role === 'admin' ? 'admin' : 'teacher' });
      b.update(D('staff', d.id), up);
      await b.commit();
      return pub(await getStaff(d.id));
    },

    async listRecords(q) {
      const c = await me();
      const cons = [];
      if (c.role !== 'admin') cons.push(where('staffId', '==', c.staffId));
      else if (q.staffId) cons.push(where('staffId', '==', q.staffId));
      if (q.year) cons.push(where('year', '==', String(q.year)));
      const snap = await getDocs(query(C('records'), ...cons));
      return snap.docs.map(x => recOut(x.id, x.data())).sort((a, b) => b.startDate.localeCompare(a.startDate));
    },

    async getPhotos(q) {
      await me();
      const s = await getDoc(D('photos', q.id));
      const d = s.exists() ? s.data() : {};
      return { p1: d.p1 || '', p2: d.p2 || '' };
    },

    async saveRecord(q) {
      const c = await me();
      const r = q.record || {};
      const isAdmin = c.role === 'admin';
      let id = r.id, old = null, staffId;
      if (id) {
        const s = await getDoc(D('records', id));
        if (!s.exists()) throw new Error('ไม่พบรายการ');
        old = s.data(); staffId = old.staffId;
        if (!isAdmin && staffId !== c.staffId) throw new Error('ไม่มีสิทธิ์แก้ไขรายการนี้');
      } else {
        staffId = isAdmin && r.staffId ? r.staffId : c.staffId;
        if (!staffId) throw new Error('บัญชีผู้ดูแลระบบบันทึกรายการของตนเองไม่ได้');
        id = doc(C('records')).id;
      }
      if (!r.year) throw new Error('กรุณาเลือกปีงบประมาณ');
      if (!r.title) throw new Error('กรุณากรอกชื่อเรื่อง/กิจกรรม');
      if (!r.startDate) throw new Error('กรุณาเลือกวันที่');
      const m = await getMeta();
      if (!m.years.includes(String(r.year))) throw new Error('ไม่พบปีงบประมาณนี้');
      const p = m.projects.find(p => p.id === r.projectId);
      const out = { staffId, updatedAt: nowISO(), createdAt: old ? old.createdAt || nowISO() : nowISO(), projectName: p ? p.name : 'อื่น ๆ (นอกโครงการ)' };
      REC_FIELDS.forEach(k => out[k] = String(r[k] === undefined || r[k] === null ? '' : r[k]).trim());
      const photos = q.photos || ['keep', 'keep'];
      const ph = { staffId };
      [1, 2].forEach(n => {
        const v = photos[n - 1];
        if (v === 'keep' || v === undefined) { out['hasPhoto' + n] = !!(old && old['hasPhoto' + n]); return; }
        const data = v && v.data ? String(v.data) : '';
        if (data.length > 480000) throw new Error('รูปภาพใหญ่เกินไป');
        ph['p' + n] = data; out['hasPhoto' + n] = !!data;
      });
      const b = writeBatch(db);
      b.set(D('records', id), out);
      b.set(D('photos', id), ph, { merge: true });
      await b.commit();
      return recOut(id, out);
    },

    async deleteRecord(q) {
      const c = await me();
      const s = await getDoc(D('records', q.id));
      if (!s.exists()) throw new Error('ไม่พบรายการ');
      if (c.role !== 'admin' && s.data().staffId !== c.staffId) throw new Error('ไม่มีสิทธิ์ลบรายการนี้');
      const b = writeBatch(db); b.delete(D('records', q.id)); b.delete(D('photos', q.id)); await b.commit();
      return true;
    },

    /* ---------- admin ---------- */
    async listStaff() {
      needAdmin(await me());
      return (await getDocs(C('staff'))).docs.map(x => pub(x.data())).sort((a, b) => a.id.localeCompare(b.id));
    },
    async deleteStaff(q) {
      needAdmin(await me());
      const s = await getStaff(q.id);
      const recs = await getDocs(query(C('records'), where('staffId', '==', q.id)));
      const b = writeBatch(db);
      recs.docs.forEach(x => { b.delete(x.ref); b.delete(D('photos', x.id)); });
      if (s.uid) { b.delete(D('users', s.uid)); b.delete(D('logins', nameKey(s.firstName))); }
      b.delete(D('staff', q.id));
      await b.commit();
      return true;
    },
    async resetPassword(q) {
      needAdmin(await me());
      const s = await getStaff(q.id);
      if (!s.uid) throw new Error('บุคลากรคนนี้ยังไม่มีบัญชี กด “สร้างบัญชีใหม่” ก่อน');
      if (isSynthetic(s.authEmail)) throw new Error('บัญชีนี้ไม่มีอีเมล ให้แก้ไขอีเมลในข้อมูลบุคลากร แล้วกด “สร้างบัญชีใหม่” (รหัสผ่านจะกลับเป็นเบอร์โทร)');
      try { await sendPasswordResetEmail(auth, s.authEmail); } catch (e) { throw new Error(authMsg(e)); }
      await updateDoc(D('staff', s.id), { pwChanged: false });
      return Object.assign(pub(Object.assign(s, { pwChanged: false })), { _msg: `ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${mask(s.authEmail)} แล้ว` });
    },
    async recreateAccount(q) {
      needAdmin(await me());
      const s = await getStaff(q.id);
      const acc = await createAccount(s);
      const b = writeBatch(db);
      if (s.uid) { b.delete(D('users', s.uid)); b.delete(D('logins', nameKey(s.firstName))); }
      linkAccount(b, s, acc);
      await b.commit();
      return Object.assign(pub(await getStaff(s.id)), { _msg: 'สร้างบัญชีใหม่แล้ว รหัสผ่านคือเบอร์โทรศัพท์' + (acc.warn ? ' · ' + acc.warn : '') });
    },
    async importStaff(q) {
      needAdmin(await me());
      const list = Array.isArray(q.list) ? q.list : [];
      if (!list.length) throw new Error('ไม่พบข้อมูลในไฟล์');
      const existing = new Map((await getDocs(C('staff'))).docs.map(x => [x.id, x.data()]));
      let added = 0, updated = 0;
      for (let i = 0; i < list.length; i += 400) {
        const b = writeBatch(db);
        list.slice(i, i + 400).forEach(src => {
          if (!src || !src.id || !src.firstName) return;
          const s = { id: String(src.id).trim(), updatedAt: nowISO() };
          ADMIN_EDITABLE.forEach(k => s[k] = src[k] === undefined || src[k] === null ? '' : String(src[k]).trim());
          if (existing.has(s.id)) updated++; else { added++; s.pwChanged = false; }
          b.set(D('staff', s.id), s, { merge: true });
        });
        await b.commit();
      }
      const acc = await createMissingAccounts();
      return Object.assign({ added, updated }, acc);
    },
    async createAccounts() { needAdmin(await me()); return createMissingAccounts(); },

    /* ---------- บัญชีผู้ดูแลระบบเพิ่มเติม (ผอ., หัวหน้างานบุคลากร) ---------- */
    async listAdmins() {
      const c = await me(); needAdmin(c);
      const snap = await getDocs(query(C('users'), where('staffId', '==', '')));
      return snap.docs.map(x => { const d = x.data(); return { uid: x.id, name: d.name || 'ผู้ดูแลระบบ (บัญชีแรก)', username: d.username || 'admin', email: d.email || '', self: x.id === c.uid }; })
        .sort((a, b) => (a.username === 'admin' ? -1 : b.username === 'admin' ? 1 : a.name.localeCompare(b.name, 'th')));
    },
    async addAdmin(q) {
      needAdmin(await me());
      const name = String(q.name || '').trim(), username = String(q.username || '').trim();
      const email = String(q.email || '').trim().toLowerCase(), pw = String(q.password || '');
      if (!name) throw new Error('กรุณากรอกชื่อ-ตำแหน่ง');
      if (!username || /\s/.test(username)) throw new Error('ชื่อผู้ใช้ต้องไม่ว่างและไม่มีช่องว่าง');
      if (!validEmail(email)) throw new Error('กรุณากรอกอีเมลที่ถูกต้อง');
      if (pw.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      if ((await getDoc(D('logins', nameKey(username)))).exists()) throw new Error('ชื่อผู้ใช้นี้มีในระบบแล้ว (ซ้ำกับครูหรือผู้ดูแลคนอื่น)');
      const sec = initializeApp(CFG.FIREBASE, 'adm' + Date.now());
      let uid;
      try { uid = (await createUserWithEmailAndPassword(getAuth(sec), email, pw)).user.uid; }
      catch (e) { throw new Error(authMsg(e)); }
      finally { deleteApp(sec).catch(() => { }); }
      const b = writeBatch(db);
      b.set(D('users', uid), { staffId: '', role: 'admin', name, username, email });
      b.set(D('logins', nameKey(username)), { email });
      await b.commit();
      return actions.listAdmins();
    },
    async deleteAdmin(q) {
      const c = await me(); needAdmin(c);
      if (q.uid === c.uid) throw new Error('ลบบัญชีที่กำลังใช้งานอยู่ไม่ได้');
      const s = await getDoc(D('users', q.uid));
      if (!s.exists() || s.data().staffId) throw new Error('ไม่พบบัญชีผู้ดูแล');
      const b = writeBatch(db);
      b.delete(D('users', q.uid));
      b.delete(D('logins', nameKey(s.data().username || 'admin')));
      await b.commit();
      return actions.listAdmins();
    },

    async addYear(q) {
      needAdmin(await me());
      const y = String(q.year || '').trim();
      if (!/^25\d\d$/.test(y)) throw new Error('ปีงบประมาณต้องเป็น พ.ศ. 4 หลัก เช่น 2571');
      const m = await getMeta();
      if (m.years.includes(y)) throw new Error('มีปีงบประมาณนี้แล้ว');
      m.years.push(y); return saveMeta(m);
    },
    async deleteYear(q) {
      needAdmin(await me());
      const y = String(q.year);
      if (!(await getDocs(query(C('records'), where('year', '==', y), limit(1)))).empty) throw new Error('ลบไม่ได้ มีรายการพัฒนาตนเองในปีนี้อยู่');
      const m = await getMeta();
      m.years = m.years.filter(x => x !== y); m.projects = m.projects.filter(p => p.year !== y);
      return saveMeta(m);
    },
    async addProject(q) {
      needAdmin(await me());
      const name = String(q.name || '').trim();
      if (!name) throw new Error('กรุณากรอกชื่อโครงการ');
      const m = await getMeta();
      if (!m.years.includes(String(q.year))) throw new Error('ไม่พบปีงบประมาณ');
      m.projects.push({ id: 'P' + Date.now().toString(36), year: String(q.year), name });
      return saveMeta(m);
    },
    async renameProject(q) {
      needAdmin(await me());
      const name = String(q.name || '').trim();
      if (!name) throw new Error('กรุณากรอกชื่อโครงการ');
      const m = await getMeta();
      const p = m.projects.find(p => p.id === q.id);
      if (!p) throw new Error('ไม่พบโครงการ');
      p.name = name;
      const recs = await getDocs(query(C('records'), where('projectId', '==', p.id)));
      const b = writeBatch(db); recs.docs.forEach(x => b.update(x.ref, { projectName: name })); await b.commit();
      return saveMeta(m);
    },
    async deleteProject(q) {
      needAdmin(await me());
      if (!(await getDocs(query(C('records'), where('projectId', '==', q.id), limit(1)))).empty) throw new Error('ลบไม่ได้ มีครูบันทึกรายการในโครงการนี้แล้ว');
      const m = await getMeta();
      m.projects = m.projects.filter(p => p.id !== q.id);
      return saveMeta(m);
    }
  };

  return {
    async handle(q) {
      const fn = actions[q.action];
      if (!fn) return { ok: false, error: 'ไม่รู้จักคำสั่ง: ' + q.action };
      try { return { ok: true, data: await fn(q) }; }
      catch (e) { return { ok: false, error: e.message === 'SESSION' ? 'SESSION' : authMsg(e) }; }
    }
  };
}
