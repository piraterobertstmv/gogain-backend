# GoGain Backend

## Environment Setup

Copy `.env.example` to `.env` for local development. In production, set the variables in the hosting platform (Render). **Never commit real values to the repository.**

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign auth tokens (e.g. `openssl rand -hex 48`) |
| `NODE_ENV` | no | `production` in production |
| `CORS_ORIGINS` | no | Comma-separated list of allowed frontend origins (overrides the defaults in `app.js`) |

The server refuses to start if `MONGO_URL` or `JWT_SECRET` is missing.

### Setting up on Render

1. Navigate to your service dashboard on Render
2. Click on "Environment" in the left sidebar
3. Add each of the above environment variables
4. Click "Save Changes"
5. Redeploy your service

## Creating the first admin user

```
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' node create-test-user.js
```

## Authentication

Every endpoint except `POST /users/login`, `GET /` and `GET /ping` requires an `Authorization: Bearer <token>` header.

- User management (`POST /users`, `DELETE /users/:id`, editing other users) is admin-only.
- Non-admin users can only read and modify their own transactions and cost transactions.

## API Endpoints

- POST /users/login - Login with email and password
- POST /users/logout - Invalidate the current token
- GET /users/me - Get current user with token
- GET /transaction - Get transactions
- GET /cost-transactions - Get cost transactions
- GET /client - Get all clients
- GET /center - Get all centers
- GET /service - Get all services
- GET /costs - Get all cost categories
