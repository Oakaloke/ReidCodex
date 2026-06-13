# ReidCodex

A static-first content/article site with a small backend. The public side is a
multi-page site (Home / About / Contact) with a category sidebar that filters
posts. The admin side is a password-protected dashboard for creating, editing,
and deleting posts that then appear on the public side.

- **Front end:** plain HTML + CSS + a little vanilla JavaScript (dark theme).
- **Back end:** Node.js + [Express](https://expressjs.com/).
- **Storage:** a single JSON file (`data/posts.json`) — easy to read and back up.
- **Auth:** one admin account from environment variables, with a signed
  session cookie (HMAC via Node's built-in `crypto` — no extra dependencies).

> Only one npm dependency: `express`. Everything else uses the Node standard library.

## Project structure

```
ReidCodex/
├── package.json          # scripts + the single dependency (express)
├── .env.example          # copy to .env and fill in
├── .gitignore
├── README.md
├── server.js             # Express app: API routes, auth, static serving, .env loader
├── lib/
│   ├── storage.js        # JSON-file CRUD for posts + categories
│   └── auth.js           # signed-cookie sessions + credential check (crypto only)
├── data/
│   └── posts.json        # the data store (seeded with a few example posts)
└── public/               # everything served to the browser
    ├── index.html        # public home: sidebar + filtered post list
    ├── about.html
    ├── contact.html
    ├── login.html        # /login
    ├── admin.html        # /admin dashboard (create/edit/delete)
    ├── css/
    │   └── styles.css
    └── js/
        ├── main.js       # public site: load categories + posts, filter
        ├── login.js      # submit login form
        └── admin.js      # dashboard logic + auth guard
```

## API overview

| Method | Route               | Auth | Purpose                          |
| ------ | ------------------- | ---- | -------------------------------- |
| GET    | `/api/categories`   | no   | List categories                  |
| GET    | `/api/posts`        | no   | List posts (`?category=Guides`)  |
| GET    | `/api/posts/:id`    | no   | Get one post                     |
| POST   | `/api/login`        | no   | Log in, sets session cookie      |
| POST   | `/api/logout`       | no   | Clear session cookie             |
| GET    | `/api/me`           | —    | Current session (401 if none)    |
| POST   | `/api/posts`        | yes  | Create a post                    |
| PUT    | `/api/posts/:id`    | yes  | Update a post                    |
| DELETE | `/api/posts/:id`    | yes  | Delete a post                    |

## Setup

### 1. Install dependencies

```bash
cd ReidCodex
npm install
```

### 2. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env
```

Then set real values in `.env`:

```ini
ADMIN_USER=your-admin-username
ADMIN_PASS=your-strong-password
SESSION_SECRET=a-long-random-string
PORT=3000
```

Generate a strong `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Credentials are **never** hardcoded in the source — they're read from the
> environment at runtime. The `.env` file is git-ignored.

You can also pass the variables inline instead of using a `.env` file:

```bash
ADMIN_USER=admin ADMIN_PASS=secret SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") npm start
```

### 3. Run it

```bash
npm start
# or, with auto-restart on file changes (Node 18+):
npm run dev
```

Open <http://localhost:3000>.

## Using the site

- **Public:** browse posts on the home page; click a category in the left
  sidebar to filter. On mobile, the sidebar collapses behind the ☰ button.
- **Admin:** go to <http://localhost:3000/login>, sign in with your
  `ADMIN_USER` / `ADMIN_PASS`, then create posts from the dashboard. New posts
  show up immediately on the public side under their category. New categories
  you type are added to the sidebar automatically.

## Notes & next steps

- Data lives in `data/posts.json`. Back it up by copying that file.
- For production, run behind HTTPS — the session cookie automatically gets the
  `Secure` flag when `NODE_ENV=production`.
- To move to SQLite later, swap the implementation in `lib/storage.js`; the
  rest of the app talks to it through that module's functions.
