# Media provenance

Every video, still and icon in this project is sourced from Riot Games' own
public VALORANT channels and re-encoded locally. The app contains **no
third-party hotlinks** — all media is served from `public/`.

## Do I need to re-download anything?

No. The re-encoded files are committed to this repository, so a fresh clone runs
as-is. The source links below are recorded for attribution and in case you want
to re-derive an asset at a different size or crop.

## Video (`public/videos/`)

Sources come from two Riot CMS buckets — `news/` and `news_live/` — discovered on
`playvalorant.com/en-us/media/`, the news index, and the official asset-kit page.

Every clip was re-encoded to **H.264 MP4** because Riot ships VP9/AV1 WebM, which
Safari cannot autoplay and which is several times larger. Settings used:

```
-an                                                   # drop audio; players only render muted
-vf "scale=<width>:-2:flags=lanczos,setsar=1,fps=30"  # square pixels, capped frame rate
-c:v libx264 -profile:v high -pix_fmt yuv420p
-crf <18-28> -maxrate <1.5-2M> -bufsize <2x>          # bitrate ceiling keeps payload sane
-preset medium -movflags +faststart
```

`feature-2` is additionally centre-cropped (`crop=1436:808`) because the original
is 1920×808 (2.37:1 cinemascope); the crop yields true 16:9 so the card does not
crop ~33% of the frame.

| Shipped file    | Original                                                                                                         | Content                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `hero-1.mp4`    | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/d099a3495438fc1a5cd423439f4e9f574e4e8fb1.webm) | stylised cinematic — aurora skyline, airborne duel, Jett on Ascent         |
| `hero-2.mp4`    | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/29c9b4207e45d824e675f5e0edb4b422182efdfa.webm) | blue ability cinematic — cards, Jett daggers, first-person duel            |
| `hero-3.mp4`    | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/43e248d82e59e5ff7c4d828e8fcb8e4a272eb380.webm)      | Phoenix ability demo — flash, wallbang, first-person firefight             |
| `hero-4.mp4`    | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/64f231a571569c677058c1f7a7a6a3e5eda4970f.webm) | Gold Rush montage — signature skin line in live play                       |
| `feature-1.mp4` | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/a243a2e4caf1d2c804a7a417f3f7c552f7be7f52.webm) | **agents** — five-agent cinematic with radianite spike and ability effects |
| `feature-2.mp4` | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/bf424151231e1ddc18cbb236fc65bd1cda0ad99f.webm) | **maps** — neon-lit battleground corridors and site architecture           |
| `feature-3.mp4` | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/64f231a571569c677058c1f7a7a6a3e5eda4970f.webm) | **arsenal** — gold/black skin line, weapon podium, first-person play       |
| `feature-4.mp4` | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/06c7914a55e13b5df25c14b8bc891ed5b67556d3.webm)      | **clutch** — point-blank shot into a wall of explosive light               |
| `feature-5.mp4` | [webm](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/02a2907260189d0988dc03091717b3b6e63143aa.webm)      | Protocol transport interior, V-mark door, agent close-ups                  |

## Stills (`public/img/`)

| Shipped file          | Origin                                                        | Content                                                 |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| `logo.png`            | VALORANT Brand Kit — `V_Logomark_Red.png` (`Logos.zip`)       | official V logomark, alpha preserved and canvas trimmed |
| `about.webp`          | Riot CMS `f320567c84ae28aec190e2f3002ce8c3642bd08a-1920x1080` | V25 key art — Sova + Phoenix, "Defy the Limits"         |
| `story.webp`          | VALORANT asset kit — `L10_Sillos_Final.jpg`                   | the Protocol — silhouetted strike team                  |
| `contact-1.webp`      | VALORANT asset kit — `Vertical_Phx.jpg`                       | vertical Phoenix key art                                |
| `contact-2.webp`      | VALORANT asset kit — `Vertical Viper.jpg`                     | vertical Viper key art                                  |
| `agent-portrait.webp` | VALORANT asset kit — `Vertical_jett.jpg`                      | vertical Jett key art                                   |
| `agent-support.webp`  | Riot CMS `4854460e10c1dcdab319c6ab9e7136af7e0310d6-1920x1080` | Jett + Sova cut-out art                                 |

Stills are re-encoded to WebP (quality 90) at the largest size each layout
actually uses, which keeps the whole image set under 650 KB.

## Brand assets and audio

- `public/img/logo.png`, `favicon.ico`, `icon1.png`, `icon2.png`,
  `apple-icon.png` — derived from the official **VALORANT Brand Kit** logomark.
  Regenerate with `python scripts/make-brand-assets.py`.
- `public/audio/loop.mp3` — a short synthesised "protocol confirm" UI sting,
  generated by the same script. **No game audio is reproduced.**

## Regenerating

```bash
npm run dev
node scripts/capture-screenshots.mjs   # refresh the README screenshots
npm run verify:media                   # assert every asset loads and is 16:9
```

---

> VALORANT and all associated artwork are trademarks of Riot Games, Inc. This is
> a non-commercial UI/UX demo. Replace these assets with your own before any
> commercial use.
