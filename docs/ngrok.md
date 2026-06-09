# Ngrok — runbook

Quick reference for exposing the local Vite dev server via ngrok.

## Setup facts

- Binary: installed via npm → `C:\Users\ג'וז מוזיקה\AppData\Roaming\npm\ngrok.cmd`
  Use `$env:APPDATA\npm\ngrok.cmd` in PowerShell (handles Hebrew username).
- Vite dev port: `5173` (see `vite.config.js`).
- Auth token is already configured in ngrok's config (no need to re-auth).
- Free plan → URL changes on each restart.

## Start the tunnel

**Always start the local dev server first — ngrok is just a proxy, it serves nothing on its own.**

1. Start the Vite dev server (background):
   ```bash
   cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
   ```
2. Start ngrok pointed at 5173:
   ```powershell
   & "$env:APPDATA\npm\ngrok.cmd" http 5173 --log=stdout
   ```

When the user asks to start ngrok — always launch `npm run dev` too, without asking.

## Get the public URL

ngrok exposes a local API at `http://127.0.0.1:4040`. Fetch the public URL with:

```powershell
(Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url
```

Web inspector UI: <http://127.0.0.1:4040>

## Stop the tunnel

Kill the ngrok process (Ctrl+C in its terminal, or `Stop-Process -Name ngrok`).

## Notes

- If port 4040 is busy → another ngrok is already running.
- If you need a stable URL → upgrade to a paid plan and use `--domain=<reserved>.ngrok-free.app`.
- For mobile testing on the same Wi‑Fi, prefer `npm run dev -- --host` over ngrok (no external hop).
