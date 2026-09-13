// Zesez Education — Paylaşılan Auth Modulu (Firebase)
// index.html və dashboard.html hər ikisi bu faylı istifadə edir.
// Bax: firebase-config.js (quraşdırma təlimatları üçün)

(function () {
  const cfg = window.ZESEZ_FIREBASE_CONFIG;
  const CONFIG_IS_PLACEHOLDER = !cfg || !cfg.apiKey || cfg.apiKey.indexOf('BURAYA_') !== -1;

  if (!CONFIG_IS_PLACEHOLDER) {
    firebase.initializeApp(cfg);
  } else {
    console.warn('[Zesez] Firebase konfiqurasiyası doldurulmayıb — zesez-portal/firebase-config.js faylına baxın.');
  }

  const auth = CONFIG_IS_PLACEHOLDER ? null : firebase.auth();
  const db = CONFIG_IS_PLACEHOLDER ? null : firebase.firestore();

  const NOT_CONFIGURED_ERR = {
    message: 'Giriş sistemi hələ quraşdırılmayıb. Sayt sahibinin firebase-config.js faylını tamamlaması lazımdır.'
  };

  const ERR_MESSAGES = {
    'auth/invalid-phone-number': 'Telefon nömrəsi düzgün formatda deyil. Nümunə: +994501234567',
    'auth/missing-phone-number': 'Zəhmət olmasa telefon nömrənizi daxil edin.',
    'auth/too-many-requests': 'Cəhd limiti aşıldı. Bir az sonra yenidən cəhd edin.',
    'auth/invalid-verification-code': 'Daxil etdiyiniz kod yanlışdır. Yenidən yoxlayın.',
    'auth/code-expired': 'Kodun vaxtı bitib. Yeni kod tələb edin.',
    'auth/popup-closed-by-user': 'Google pəncərəsi bağlandı. Yenidən cəhd edin.',
    'auth/cancelled-popup-request': 'Əməliyyat ləğv olundu, yenidən cəhd edin.',
    'auth/network-request-failed': 'İnternet bağlantısı ilə bağlı problem yarandı.',
    'auth/user-disabled': 'Bu hesab bloklanıb. Dəstək xidməti ilə əlaqə saxlayın.',
    'auth/unauthorized-domain': 'Bu domen Firebase konsolunda təsdiqlənməyib (Authorized domains).'
  };

  function friendlyError(err) {
    if (!err) return 'Naməlum xəta baş verdi. Yenidən cəhd edin.';
    return ERR_MESSAGES[err.code] || err.message || 'Naməlum xəta baş verdi. Yenidən cəhd edin.';
  }

  let recaptchaVerifier = null;
  let confirmationResult = null;

  function ensureRecaptcha() {
    if (!recaptchaVerifier) {
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' }, auth);
    }
    return recaptchaVerifier;
  }

  async function upsertUserProfile(user, extra) {
    if (!db) return;
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    const base = {
      displayName: user.displayName || (extra && extra.displayName) || null,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      providerId: (user.providerData[0] && user.providerData[0].providerId) || 'unknown',
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!snap.exists) {
      base.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(base, { merge: true });
  }

  async function signInWithGoogle() {
    if (CONFIG_IS_PLACEHOLDER) throw NOT_CONFIGURED_ERR;
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    await upsertUserProfile(result.user);
    return result.user;
  }

  async function startPhoneSignIn(phoneNumber) {
    if (CONFIG_IS_PLACEHOLDER) throw NOT_CONFIGURED_ERR;
    try {
      const verifier = ensureRecaptcha();
      confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, verifier);
      return true;
    } catch (err) {
      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch (e) { /* ignore */ }
        recaptchaVerifier = null;
      }
      throw err;
    }
  }

  async function confirmPhoneCode(code, displayName) {
    if (CONFIG_IS_PLACEHOLDER) throw NOT_CONFIGURED_ERR;
    if (!confirmationResult) throw { message: 'Əvvəlcə telefon nömrənizə kod göndərin.' };
    const result = await confirmationResult.confirm(code);
    await upsertUserProfile(result.user, { displayName });
    if (displayName && !result.user.displayName) {
      try { await result.user.updateProfile({ displayName: displayName }); } catch (e) { /* ignore */ }
      if (db) await db.collection('users').doc(result.user.uid).set({ displayName: displayName }, { merge: true });
    }
    confirmationResult = null;
    return result.user;
  }

  async function signOutUser() {
    if (auth) await auth.signOut();
  }

  function onAuthChange(cb) {
    if (!auth) { cb(null); return; }
    auth.onAuthStateChanged(cb);
  }

  async function getProfile(uid) {
    if (!db) return null;
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  async function saveProfile(uid, data) {
    if (!db) throw NOT_CONFIGURED_ERR;
    await db.collection('users').doc(uid).set(data, { merge: true });
  }

  window.ZesezAuth = {
    isConfigured: !CONFIG_IS_PLACEHOLDER,
    friendlyError: friendlyError,
    signInWithGoogle: signInWithGoogle,
    startPhoneSignIn: startPhoneSignIn,
    confirmPhoneCode: confirmPhoneCode,
    signOutUser: signOutUser,
    onAuthChange: onAuthChange,
    getProfile: getProfile,
    saveProfile: saveProfile,
    get storage() { return CONFIG_IS_PLACEHOLDER ? null : firebase.storage(); }
  };
})();
