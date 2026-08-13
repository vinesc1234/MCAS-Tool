# Setup — from here to running on your phones

Work through these in order. Total time: about 30–45 minutes, most of it waiting.

You need three accounts. All free except the API usage.

| Account | For | Cost |
| --- | --- | --- |
| [Anthropic Console](https://console.anthropic.com) | The API key that reads labels | Pay-as-you-go, ~1.8¢/photo |
| [GitHub](https://github.com) | Stores the code | Free |
| [Vercel](https://vercel.com) | Hosts the app | Free tier is plenty |

---

## 1. Anthropic — get the API key and set the real spend limit

1. Sign up at **console.anthropic.com**.
2. **Billing → add a payment method**, then add credit (start with $5–10; there's no subscription).
3. **Limits → set a monthly spend limit.** Put in **$5/month** — that covers the $20/year plan with
   room for a heavy month. Add your email for the alert.
   *This is the cap that actually can't be bypassed. The in-app one is a convenience.*
4. **API keys → Create Key.** Copy it — it starts `sk-ant-` and is shown **once**.
   Paste it somewhere safe for the next few minutes.

## 2. Set your git identity

One-time, on this computer. Use any name and email.

```bash
git config --global user.name "Your Name"
```

```bash
git config --global user.email "you@example.com"
```

## 3. Put the code on GitHub

Create an empty repo at **github.com/new**. Name it `mcas-tracker`. **Private.**
Don't add a README, .gitignore, or license — the project already has them.

Then, from the project folder:

```bash
cd C:\Users\vines\Projects\mcas-tracker && git init -b main && git add . && git commit -m "MCAS trigger tracker"
```

```bash
git remote add origin https://github.com/YOUR-USERNAME/mcas-tracker.git && git push -u origin main
```

Replace `YOUR-USERNAME`. GitHub will ask you to sign in — use the browser prompt it offers.

## 4. Deploy on Vercel

1. Sign up at **vercel.com** — choose **Continue with GitHub**.
2. **Add New → Project**, find `mcas-tracker`, click **Import**.
3. Leave the build settings alone. Vercel detects Vite and the `api/` folder on its own.
4. Before clicking Deploy, expand **Environment Variables** and add two:

   | Name | Value |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | the `sk-ant-…` key from step 1 |
   | `APP_PASSCODE` | the passcode you were given (or any long random string) |

5. **Deploy.** Takes about a minute. You get a URL like `mcas-tracker-abc123.vercel.app`.

## 5. Install on both phones

On each phone, in the browser:

1. Open the Vercel URL.
2. **iPhone:** Share → *Add to Home Screen*. **Android:** menu → *Install app*.
3. Open it from the home screen icon.
4. **Settings → Reading labels from photos** → enter the passcode → **Save**.

That's it. Take a photo and the ingredients should come back in a few seconds.

---

## Check it's working

- Photograph an ingredients label you can read yourself, and confirm what comes back matches.
  Do this three or four times before trusting it on something unfamiliar.
- Photograph food with **no** label (a plate of dinner). It should identify the dish and mark the
  ingredients as inferred rather than read.
- Turn the phone to airplane mode and open the app — it should still load and let you log entries
  by hand. Only label reading needs a connection.
- **Settings → Download full backup** and check the file saves. Do this every few weeks; the log
  lives only on the phone.

## If something's wrong

| Symptom | Cause |
| --- | --- |
| "Server is not configured yet" | An environment variable is missing or misspelled in Vercel. After adding one you must **redeploy** — Vercel doesn't apply them to an existing deployment. |
| "Wrong passcode" | The Settings passcode doesn't match `APP_PASSCODE` exactly. Check for a trailing space. |
| "Analysis failed" | Usually out of API credit, or the key was revoked. Check Console → Billing. |
| Nothing happens after a photo | Check **Settings → Analyze photos automatically** is on. |

## Making changes later

Push to `main` and Vercel redeploys automatically:

```bash
git add . && git commit -m "what changed" && git push
```
