# Vehicle Hub Vue frontend

Vue 3 + TypeScript web application for the Vehicle Hub Laravel API.

## Run locally

Start Laravel from the backend folder:

```bash
cd ../vehicle-hub-be
php artisan serve
```

Then start Vue in another terminal:

```bash
cd vehicle-hub-fe
cp .env.example .env
npm install
npm run dev
```

The default API URL is `http://localhost:8000/api/v1`. Change `VITE_API_URL` in `vehicle-hub-fe/.env` when the API uses another host.

Seeded credentials:

```text
owner1@vehiclehub.test
password
```

## Commands

- `npm run dev` — local Vite development server
- `npm run build` — TypeScript check and production build
- `npm run preview` — preview the production bundle

Authentication tokens are sent as Sanctum bearer tokens. A 401 response clears the expired session and returns the user to login.
