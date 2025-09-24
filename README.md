
# ISA-PHM Wizard

A small React + Vite application that helps create and manage ISA/PHM-style study metadata. The project is a work-in-progress and provides a set of tools for creating investigations, selecting test setups, mapping study variables, and exporting structured metadata.

This repository started as a course project and has been extended with an interactive data grid, mapping helpers, and a small landing experience.

## What’s in this repo

- A React app bootstrapped with Vite
- A `GlobalDataContext` provider that holds studies, test setups, mappings and other app data (persisted to localStorage)
- Pages/components for:
	- Landing / Home page (quick access to main tools)
	- ISA Questionnaire form (capture investigation metadata)
	- Test Setups management
	- Study variable mapping grid(s)
	- An About page that embeds the official ISA-PHM Dutch Prognostics Lab page and acts as a local wiki with extra notes
- Several reusable UI and typography components under `src/components`
- Utility hooks (e.g. `useDataGrid`, `useRichMappings`) in `src/hooks`

## Recent changes

- Home page converted into a landing page with larger hero and big CTA cards for About, Test Setups and ISA Questionnaire.
- About page now embeds the public ISA-PHM Dutch Prognostics Lab and provides a local wiki/notes area and a direct link to the official page.
- A `PageWrapper` component centralizes the page background and card styling; pages can request a wider layout via the `widthClass` prop.
- `NewGrid` branch merged into `main` (merge commit included in the repo history).

## Run locally

Install and start the dev server (PowerShell):

```powershell
npm install
npm run dev
```

Open the app at the URL reported by Vite (usually http://localhost:5173).

Build for production and preview:

```powershell
npm run build
npm run preview
```

## Files of interest

- `src/layout/PageWrapper.jsx` — global page background and centered card layout
- `src/contexts/GlobalDataContext.jsx` — main application state and persistence
- `src/pages/Home.jsx` — landing page (hero + CTAs)
- `src/pages/About.jsx` — iframe embed of the ISA-PHM Dutch Prognostics Lab + local wiki
- `src/pages/IsaQuestionnaire.jsx` — investigation form
- `src/components` — UI components, typography, cards, grids
- `src/hooks` — custom hooks used across the app

## Notes & limitations

- The About page uses an iframe to embed an external website. Many websites disallow embedding via `X-Frame-Options` or CSP. When embedding is blocked the app shows a fallback button to open the official site in a new tab.
- Cross-origin iframes cannot be styled or controlled from the parent page due to browser security (same-origin policy). The app provides a visual wrapper only.
- If you want to mirror or theme the embedded site locally, consider building a server-side proxy that fetches and rewrites HTML/CSS — this requires a backend and appropriate permissions.

## Backend

The backend for this project lives in a separate repository: https://github.com/NathanHouwaart/ISA-PHM-Backend

That repository is responsible for server-side functionality such as conversions, storage endpoints, and any API used by the front-end. If you plan to run the full stack locally, clone and start that repo alongside this one.

If you want a different README layout or additional sections (development checklist, code owners, example screenshots), tell me which sections you'd like and I will update it.
