# personal-website

Personal portfolio built with Astro and Tailwind CSS, hosted on GitHub Pages.

## Edit content

- Identity and links: `src/data/site.ts`
- Projects: `src/data/projects.ts` (set `featured: true` to show on the home page)
- About copy and experience: `src/pages/about.astro`
- Social preview image: `public/og.png` (1200x630)

## Develop

Requires Node 22.12 or newer.

    npm install
    npm run dev       # http://localhost:4321
    npm run build     # output to dist/
    npm run preview   # serve the built site
    npm run check     # type check

## Deploy

Pushing to `main` builds and deploys to https://jonathanpan.me through
GitHub Actions (`.github/workflows/deploy.yml`). One time only: in the repo
settings, set Pages source to GitHub Actions. To verify the site in Google Search
Console, paste the token into `googleSiteVerification` in `src/data/site.ts`.

## Surfboard counter (optional)

The home page has a surfboard "press to add 1" counter. It stays inactive until
you set `counterApiUrl` and `turnstileSiteKey` in `src/data/site.ts`. The backend
is a Cloudflare Worker in `worker/`; see `worker/README.md` for setup.
