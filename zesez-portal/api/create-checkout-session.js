// api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Used only until the site owner sets FIREBASE_SERVICE_ACCOUNT_KEY in Vercel —
// once that's set, authoritative prices come from Firestore (admin-editable
// in admin.html) instead of these hardcoded values.
const FALLBACK_CATALOG = {
  atlas_one_time: { name: 'Universitet Atlası (Kilidi Aç)', amount: 1900, mode: 'payment' },
  zesez_standard_sub: { name: 'Zesez Standard Abunəlik', amount: 3500, mode: 'subscription', interval: 'month' },
  zesez_pro_vip_sub: { name: 'Zesez PRO VIP Abunəlik', amount: 5900, mode: 'subscription', interval: 'month' },
  all_inclusive: { name: 'Zesez All-Inclusive VIP Paket', amount: 140000, mode: 'payment' },
  admission: { name: 'Tam Qəbul Dəstəyi Paketi', amount: 90000, mode: 'payment' },
  visa: { name: 'Tələbə Viza Dəstəyi Paketi', amount: 40000, mode: 'payment' }
};

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!svc) return null;
  try {
    const creds = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(creds) });
    return admin;
  } catch (err) {
    console.error('Firebase Admin başlatma xətası:', err);
    return null;
  }
}

async function getPackagePrice(db, id) {
  if (db) {
    try {
      const snap = await db.collection('packages').doc(id).get();
      if (snap.exists) {
        const d = snap.data();
        return {
          name: d.name || id,
          amount: Math.round((d.priceAZN || 0) * 100),
          mode: d.mode || 'payment',
          interval: d.interval || 'month'
        };
      }
    } catch (err) {
      console.error('Firestore packages oxuma xətası:', err);
    }
  }
  return FALLBACK_CATALOG[id] || null;
}

async function getDocServicePrice(db, id) {
  if (!db) return null;
  try {
    const snap = await db.collection('doc_services').doc(id).get();
    if (snap.exists) {
      const d = snap.data();
      return { name: d.name || id, amount: Math.round((d.priceAZN || 0) * 100) };
    }
  } catch (err) {
    console.error('Firestore doc_services oxuma xətası:', err);
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      packageId,
      selectedPackageIds,
      selectedDocServiceIds,
      customerEmail,
      customerName,
      customerPhone
    } = req.body;
    const origin = req.headers.origin || 'https://' + req.headers.host;

    const fbAdmin = getFirebaseAdmin();
    const db = fbAdmin ? fbAdmin.firestore() : null;

    let line_items = [];
    let mode = 'payment';

    if (packageId) {
      // Fixed subscription / one-time tiers (Atlas, Standard, PRO VIP)
      const pkg = await getPackagePrice(db, packageId);
      if (!pkg) {
        return res.status(400).json({ error: 'Etibarsız paket seçimi' });
      }
      mode = pkg.mode;
      line_items.push({
        price_data: {
          currency: 'azn',
          product_data: { name: pkg.name, description: 'Zesez Education Xidməti' },
          unit_amount: pkg.amount,
          recurring: mode === 'subscription' ? { interval: pkg.interval } : undefined
        },
        quantity: 1
      });
    } else if (
      (Array.isArray(selectedPackageIds) && selectedPackageIds.length) ||
      (Array.isArray(selectedDocServiceIds) && selectedDocServiceIds.length)
    ) {
      // Custom combination (All-Inclusive/Admission/Visa + per-country doc
      // services) — the total is computed HERE from Firestore, never trusted
      // from the client, so a visitor can't tamper with the checkout amount.
      let total = 0;
      const nameParts = [];

      for (const id of selectedPackageIds || []) {
        const pkg = await getPackagePrice(db, id);
        if (pkg) { total += pkg.amount; nameParts.push(pkg.name); }
      }
      for (const id of selectedDocServiceIds || []) {
        const svc = await getDocServicePrice(db, id);
        if (svc) { total += svc.amount; nameParts.push(svc.name); }
      }

      if (total <= 0) {
        return res.status(400).json({ error: 'Seçilmiş xidmətlər tapılmadı' });
      }

      line_items.push({
        price_data: {
          currency: 'azn',
          product_data: {
            name: 'Zesez — Seçilmiş Xidmətlər Paketi',
            description: nameParts.join(', ').slice(0, 500)
          },
          unit_amount: total
        },
        quantity: 1
      });
    } else {
      return res.status(400).json({ error: 'Etibarsız paket və ya seçim' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode,
      customer_email: customerEmail || undefined,
      metadata: {
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        packageId: packageId || 'custom_selection'
      },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Xətası:', error);
    return res.status(500).json({ error: error.message });
  }
};
