# Migration Frontend App Example

This is a Contentful Page App frontend for managing and visualizing migration progress, designed to work with a simple Express backend. It was bootstrapped with [Create Contentful App](https://github.com/contentful/create-contentful-app).

## Overview

This app lets you:

- Start a migration process (simulated via backend)
- See live migration status and history
- Prevent starting a new migration until the current one completes
- Leave and return to the page and see migration progress (state is persisted)

## Architecture

- **Frontend:** React + Forma 36, runs as a Contentful Page App
- **Backend:** Express server (see `migration-app-example`), simulates migration jobs and exposes endpoints for starting and polling migration status

## Local Development

1. **Start the backend:**

   - Go to `migration-app-example`
   - Run `npm install` and `npm start` (default port: 3000)

2. **Start the frontend:**

   - Go to `migration-frontend-app`
   - Run `npm install` and `npm start` (default port: 3333)

3. **Configure Contentful App:**
   - Register the frontend as a Page App in Contentful
   - Set the backend URL in the frontend code if needed (default: `http://localhost:3000`)

## Features

- **Start Migration:** Button triggers a backend job, disables until migration completes
- **Polling:** UI polls backend for migration status every 3 seconds
- **History:** Shows all migrations, with status, timestamps, and duration
- **Persistence:** Migration state is saved in localStorage so users can leave and return
- **Responsive UI:** Two-column layout, migration history is a vertical list

## Environment Variables

For backend request verification, set `CONTENTFUL_APP_SECRET` in `.env` in `migration-app-example`.

## Libraries

- [Forma 36](https://f36.contentful.com/) – Contentful's design system
- [Contentful Field Editors](https://www.contentful.com/developers/docs/extensibility/field-editors/) – Contentful's field editor React components

## Learn More

- [Contentful App Framework Docs](https://www.contentful.com/developers/docs/extensibility/app-framework/create-contentful-app/)
