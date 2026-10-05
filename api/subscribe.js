// Vercel serverless function: adds website sign-ups to Brevo and sends the follow-up emails.
// Env vars (Vercel → Settings → Environment Variables):
//   BREVO_API_KEY       required. Brevo → profile menu → SMTP & API → API Keys → Generate.
//   BREVO_LIST_ID       optional, defaults to 9 (the "JAYSONCAIN.COM" list).
//   BREVO_SENDER_EMAIL  optional, must be a verified sender in Brevo. Without it, no emails are sent (contacts still save).
//   NOTIFY_EMAIL        optional, where callback requests go. Defaults to lending@jaysoncain.com.

const SITE = 'https://jaysoncain.com';
const DOWNLOADS = [
  ['LA investor financing checklist', '/downloads/la-investor-financing-checklist.pdf'],
  ['DSCR rent-coverage worksheet', '/downloads/dscr-rent-coverage-worksheet.pdf'],
  ['Bank statement loan prep guide', '/downloads/bank-statement-loan-prep-guide.pdf'],
  ['Loan Estimate comparison sheet', '/downloads/loan-estimate-comparison-sheet.pdf'],
];
const FOOTER = '<p style="font-size:12px;color:#5A645E;line-height:1.5;margin-top:28px;border-top:1px solid #DDD8CD;padding-top:12px">Jayson Cain, NMLS #2270200. Loans brokered through HP Mortgage LLC, NMLS #1456273. Equal Housing Opportunity. For education only, not a loan offer or commitment.</p>';

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function brevo(path, body) {
  const r = await fetch('https://api.brevo.com/v3' + path, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok && r.status !== 204) {
    const t = await r.text();
    throw new Error(path + ' ' + r.status + ' ' + t);
  }
}

function welcomeHtml(name) {
  const links = DOWNLOADS.map(([t, u]) => `<li style="margin:6px 0"><a href="${SITE}${u}" style="color:#1E4634;font-weight:600">${t}</a></li>`).join('');
  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#16211C;max-width:560px">
<p>Hi ${esc(name) || 'there'},</p>
<p>Thanks for signing up. Here are the free guides I mentioned:</p>
<ul style="padding-left:20px">${links}</ul>
<p>If you're looking at a property or already have a quote, reply to this email or <a href="${SITE}/schedule" style="color:#1E4634;font-weight:600">book a call</a>. Happy to walk through it with you.</p>
<p>Jayson</p>${FOOTER}</div>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!process.env.BREVO_API_KEY) return res.status(500).json({ ok: false, error: 'not configured' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const email = String(b.EMAIL || '').trim().toLowerCase();
  // Honeypot: bots fill it with junk. Browser autofill may copy the visitor's own email into it, so allow that.
  const hp = String(b.email_address_check || '').trim().toLowerCase();
  if (hp && hp !== email && !/@/.test(hp)) return res.status(200).json({ ok: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'email' });

  const type = b.type === 'callback' ? 'callback' : 'newsletter';
  const first = String(b.FIRSTNAME || '').trim().slice(0, 80);
  const last = String(b.LASTNAME || '').trim().slice(0, 80);
  let phone = String(b.SMS || '').replace(/\D/g, '');
  if (phone.length === 11 && phone[0] === '1') phone = phone.slice(1);

  const attributes = {};
  if (first) attributes.FIRSTNAME = first;
  if (last) attributes.LASTNAME = last;
  if (phone.length === 10) attributes.SMS = '+1' + phone;

  try {
    await brevo('/contacts', {
      email, attributes, updateEnabled: true,
      listIds: [parseInt(process.env.BREVO_LIST_ID || '9', 10)],
    });
  } catch (e) {
    // A duplicate phone number can block the SMS attribute; retry without it.
    if (attributes.SMS) {
      delete attributes.SMS;
      try { await brevo('/contacts', { email, attributes, updateEnabled: true, listIds: [parseInt(process.env.BREVO_LIST_ID || '9', 10)] }); }
      catch (e2) { console.error(e2); return res.status(502).json({ ok: false }); }
    } else { console.error(e); return res.status(502).json({ ok: false }); }
  }

  const sender = process.env.BREVO_SENDER_EMAIL;
  if (sender) {
    const from = { name: 'Jayson Cain', email: sender };
    try {
      if (type === 'newsletter') {
        await brevo('/smtp/email', {
          sender: from, replyTo: { email: process.env.NOTIFY_EMAIL || 'lending@jaysoncain.com', name: 'Jayson Cain' },
          to: [{ email, name: [first, last].join(' ').trim() || undefined }],
          subject: 'Your free guides from Jayson Cain',
          htmlContent: welcomeHtml(first),
        });
      } else {
        const rows = [['Name', first + ' ' + last], ['Phone', phone], ['Email', email], ['Topic', b.TOPIC], ['Best time', b.BEST_TIME]]
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5A645E">${k}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join('');
        await brevo('/smtp/email', {
          sender: from, replyTo: { email },
          to: [{ email: process.env.NOTIFY_EMAIL || 'lending@jaysoncain.com' }],
          subject: 'Callback request: ' + (first || email),
          htmlContent: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px"><p>New callback request from jaysoncain.com</p><table>${rows}</table></div>`,
        });
      }
    } catch (e) { console.error(e); } // contact is saved; don't fail the visitor over email
  }

  return res.status(200).json({ ok: true });
};
