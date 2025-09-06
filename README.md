# Payken (Tierlock) Backend for Thunkable — One-time Purchases

This is a drop-in Node/Express backend that creates Tierlock (Payken) checkout links and verifies transactions for your Thunkable game.

## Endpoints
- `GET /create-checkout?item=coins_10&user=UID123&name=Game+Purchase` → `{ url }`
- `GET /verify?transaction_id=...&user=UID123` → `{ verified: true/false, raw }`
- `GET /return` → simple HTML page shown after payment redirect

## Items / Prices
Edit `ITEMS` in `server.js` (default: 10, 20, 40, 50, 100 USD).

## Setup
1. `cp .env.example .env` and fill values.
2. `npm install`
3. `npm start`

## Deploy
- **Render**: create a Web Service, build command `npm install`, start `npm start`. Set env vars from `.env`.
- **Railway/Fly.io/Heroku**: similar; or use the included `Dockerfile`.

## Thunkable Flow (External Browser)
- Use **Open Link** to open the URL returned by `/create-checkout`.
- After payment, Tierlock redirects to your `APP_RETURN_BASE` `/return` route.
- Back in the app, call `/verify?transaction_id=...` to confirm and grant coins.

## Security Notes
- Never embed your merchant secret in the app; keep it on the server.
- Record `transaction_id` in your DB, refuse to grant twice (anti-replay).
