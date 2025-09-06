import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MERCHANT_ID = process.env.PAYKEN_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYKEN_MERCHANT_SECRET;
const BASE = process.env.PAYKEN_BASE || "https://test.payken.io"; // swap to production later
const APP_RETURN_BASE = process.env.APP_RETURN_BASE || "https://example.com"; // your domain for return page

// Authoritative price table (edit as needed)
const ITEMS = {
  coins_10: 10.00,
  coins_20: 20.00,
  coins_40: 40.00,
  coins_50: 50.00,
  coins_100: 100.00
};

function assertCreds() {
  if (!MERCHANT_ID || !MERCHANT_SECRET) {
    throw new Error("Missing PAYKEN_MERCHANT_ID or PAYKEN_MERCHANT_SECRET in environment");
  }
}

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, service: "payken-backend", items: Object.keys(ITEMS) });
});

// 1) Create a Tierlock checkout link (one-time "purchase")
app.get("/create-checkout", (req, res) => {
  try {
    assertCreds();
    const { item, user="guest", name="Game Purchase" } = req.query;
    const amount = ITEMS[item];
    if (!amount) return res.status(400).json({ error: "unknown_item", items: Object.keys(ITEMS) });

    const displayName = encodeURIComponent(`${name} (${item})`);
    const userInfo = encodeURIComponent(user);
    const returnUrl = encodeURIComponent(`${APP_RETURN_BASE}/return?user=${userInfo}`);

    const url =
      `${BASE}/invoice/merchant_id=${MERCHANT_ID}&merchant_secret=${MERCHANT_SECRET}` +
      `?display_name=${displayName}&total=${amount}&type=purchase&return_url=${returnUrl}`;

    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: "create_failed", message: e.message });
  }
});

// 2) Verify a payment by transaction_id
app.get("/verify", async (req, res) => {
  try {
    assertCreds();
    const { transaction_id, user = "guest" } = req.query;
    if (!transaction_id) {
      return res.status(400).json({ error: "missing_transaction_id" });
    }

    const resp = await fetch("https://api.payken.io/api/v1/auth/paymentData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        merchant_secret: MERCHANT_SECRET,
        user_info: user,
        id: transaction_id,
      }),
    });
    const data = await resp.json();

    // ✅ fixed "or" → "||"
    const paid = (data?.status === true) || (data?.payment_status === "success");

    res.json({ verified: Boolean(paid), raw: data });
  } catch (e) {
    res.status(500).json({
      verified: false,
      error: "verify_failed",
      message: e.message,
    });
  }
});


// 3) Browser return page (optional)
app.get("/return", (req, res) => {
  const { status, transaction_id, user } = req.query;
  res.setHeader("Content-Type", "text/html");
  res.end(`<!doctype html>
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style="font-family: system-ui; padding: 24px;">
        <h2>Payment ${status === "true" ? "Successful" : "Result"}</h2>
        <p><b>Status:</b> ${status}</p>
        <p><b>Transaction ID:</b> ${transaction_id || "(none provided)"} </p>
        <p><b>User:</b> ${user || "(unknown)"} </p>
        <p>You can now return to the app.</p>
      </body>
    </html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("payken-backend listening on port", PORT));
