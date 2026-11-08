# FundInTech Post Studio

Generates branded 3-slide TikTok photo carousels (1080×1440) for opportunities such as scholarships, fellowships, grants, conferences, freelancing and online earning. It picks **2 posts per day** and can send them to TikTok automatically.

## What's inside

| Path | What it does |
| --- | --- |
| `data/opportunities.json` | Your content. Add a new opportunity here. Only items with `"verified": true` are scheduled. |
| `/studio` | Shows today's 2 posts with slide previews, full-size downloads and a copy-caption button. Use `/studio?all=1` to see everything. |
| `/api/slide/<id>/<1-3>.jpg` | Renders one slide as a JPEG (`.png` also works). |
| `/api/cron/post?slot=0` and `?slot=1` | Posts today's 1st or 2nd carousel to TikTok. `vercel.json` runs them at 07:00 and 17:00 UTC. |
| `/api/tiktok/connect` | Connects your TikTok account once (OAuth). |

Rotation is stateless: each day takes the next 2 verified items in the list and loops back to the start after the last one. Add items to keep posts fresh.

## Option A: post manually (works today, no approval needed)

1. `npm install && npm run dev`, or deploy to Vercel.
2. Open `/studio` on your phone and save the 3 slides.
3. In TikTok, choose **Photo**, select the 3 images, add trending music, paste the caption and post.

## Option B: automatic posting with the TikTok API

1. Create an app at <https://developers.tiktok.com> and add the **Login Kit** and **Content Posting API** products.
   - Add scopes `user.info.basic`, `video.upload` and `video.publish`.
   - Set the redirect URI to `https://YOUR-DOMAIN/api/tiktok/callback`.
   - Under URL properties, verify your domain. TikTok only pulls images from verified URL prefixes.
2. Deploy to Vercel and set these env vars:
   - `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
   - `PUBLIC_BASE_URL`, e.g. `https://fundintech.vercel.app`
   - `CRON_SECRET`, any long random string (Vercel Cron sends it automatically)
3. Open `https://YOUR-DOMAIN/api/tiktok/connect` and log in with **@fundntech**. Copy the token it shows into `TIKTOK_REFRESH_TOKEN`, then redeploy.
4. Test without posting:
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-DOMAIN/api/cron/post?slot=0&dry=1"`

**Post modes (`TIKTOK_POST_MODE`):**
- `MEDIA_UPLOAD` (default): each carousel lands in your TikTok inbox as a draft. Open the notification, add a sound and tap Post. This works before TikTok audits your app, and adding a trending sound yourself helps reach.
- `DIRECT_POST`: publishes fully automatically. Until TikTok audits and approves your app, these posts can only be **private** (`SELF_ONLY`). After approval, set `TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE`.

## Content accuracy

Your followers act on these posts. Before you set `"verified": true`, check every deadline and link on the official website. Never post an opportunity you can't trace to its official source. The starter entries use cautious "usually opens..." deadline wording, so update them with exact dates when each cycle opens.

## Daily schedule

`data/schedule.json` maps each UTC date to `[earning post, academic post]`. The 07:00 UTC job posts the first and the 17:00 UTC job posts the second. When a date is missing or an item's `deadlineISO` has passed, the app picks another open item of the same kind. Add new opportunities to `data/opportunities.json` and extend the schedule.

Emoji graphics: [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0).
