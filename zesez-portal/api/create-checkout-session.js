// api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_CATALOG = {
  // Subscriptions & Paywall Tiers
  'atlas_one_time': { name: 'Universitet Atlası (Kilidi Aç)', amount: 1900, currency: 'azn', mode: 'payment' },
  'zesez_standard_sub': { name: 'Zesez Standard Abunəlik', amount: 3500, currency: 'azn', mode: 'subscription', interval: 'month' },
  'zesez_pro_vip_sub': { name: 'Zesez PRO VIP Abunəlik', amount: 5900, currency: 'azn', mode: 'subscription', interval: 'month' },

  // Core Service Packages
  'pkg_all_inclusive': { name: 'Zesez All-Inclusive VIP Paket', amount: 140000, currency: 'azn', mode: 'payment' },
  'pkg_admission': { name: 'Tam Qəbul Dəstəyi Paketi', amount: 90000, currency: 'azn', mode: 'payment' },
  'pkg_visa': { name: 'Tələbə Viza Dəstəyi Paketi', amount: 40000, currency: 'azn', mode: 'payment' }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { packageId, customAmount, customerEmail, customerName, customerPhone } = req.body;
    const origin = req.headers.origin || 'https://' + req.headers.host;

    let line_items = [];
    let mode = 'payment';

    if (packageId && PRICE_CATALOG[packageId]) {
      const item = PRICE_CATALOG[packageId];
      mode = item.mode;

      if (mode === 'subscription') {
        line_items.push({
          price_data: {
            currency: item.currency,
            product_data: {
              name: item.name,
              description: 'Zesez Education Abunəlik Paketi'
            },
            unit_amount: item.amount,
            recurring: { interval: item.interval }
          },
          quantity: 1
        });
      } else {
        line_items.push({
          price_data: {
            currency: item.currency,
            product_data: {
              name: item.name,
              description: 'Zesez Education Təhsil Xidməti'
            },
            unit_amount: item.amount
          },
          quantity: 1
        });
      }
    } else if (customAmount && customAmount > 0) {
      // For dynamic calculator totals
      line_items.push({
        price_data: {
          currency: 'azn',
          product_data: {
            name: 'Seçilmiş Fərdi Xidmətlər Paketi',
            description: 'Avropada qəbul, viza və daxili sənədləşmə paketi'
          },
          unit_amount: Math.round(customAmount * 100)
        },
        quantity: 1
      });
    } else {
      return res.status(400).json({ error: 'Etibarsız paket və ya məbləğ' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode,
      customer_email: customerEmail || undefined,
      metadata: {
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        packageId: packageId || 'custom_quote'
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
