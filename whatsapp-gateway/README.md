# whatsapp-gateway

Standalone WhatsApp gateway (Baileys, no browser) for MyClinics. Owns the
WhatsApp connections; the MyClinics API talks to it over HMAC-signed HTTP.
See [docs/whatsapp-gateway.md](../docs/whatsapp-gateway.md) for the full contract.

## Run locally

```bash
# .env needs GATEWAY_SECRET (identical to the API's), BACKEND_URL, GATEWAY_PORT:
cat > .env <<'EOF'
GATEWAY_PORT=4100
GATEWAY_SECRET=<same 64-char secret as the API's GATEWAY_SECRET>
BACKEND_URL=http://127.0.0.1:3100
EOF
npm install
npm start              # listens on GATEWAY_PORT (default 4100)
curl -s http://127.0.0.1:4100/health
```

## Production (13.239.83.200, same host as the API)

```bash
chmod 400 /path/to/MyClinic.pem
tar --exclude=node_modules -czf /tmp/gw.tar.gz .
scp -i /path/to/MyClinic.pem /tmp/gw.tar.gz ubuntu@13.239.83.200:~/
ssh -i /path/to/MyClinic.pem ubuntu@13.239.83.200
tar -xzf ~/gw.tar.gz -C ~/whatsapp-gateway && cd ~/whatsapp-gateway
npm install --omit=dev
# .env reuses the API's GATEWAY_SECRET, BACKEND_URL=http://127.0.0.1:3100
pm2 start ecosystem.config.cjs --update-env && pm2 save
# verify on the server:
curl -s http://127.0.0.1:4100/health
```

Then point the API at it (`backend/.env.local`):
`GATEWAY_URL=http://127.0.0.1:4100`, followed by
`pm2 reload myclinic-api --update-env`.

## Endpoints (all HMAC-signed except `/` and `/health`)

- `POST /sessions/:id/start` — connect (returns QR as data URL while `QR_REQUIRED`)
- `GET /sessions/:id/status` — `404` when never seen
- `POST /sessions/:id/stop` — disconnect, keep pairing
- `DELETE /sessions/:id` — logout + delete pairing
- `POST /sessions/:id/messages|documents` — send (`409` when not connected)
