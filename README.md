# Auth

Simple Node.js example showing Google authentication (OAuth) with JWT and MongoDB.

Features
- Google OAuth sign-in
- User model stored in MongoDB
- JWT-based session/token handling
- Basic public pages (index, login, signup, profile)

Project structure
- index.js — app entrypoint
- auths/google.js — Google OAuth logic
- models/User.js — Mongoose user model
- public/ — static HTML pages (index.html, login.html, signup.html, profile.html)
- .env — environment variables (not checked in)

Prerequisites
- Node.js v14+ (or compatible)
- npm or yarn
- A MongoDB database (Atlas or self-hosted)
- Google Cloud Console project with OAuth 2.0 Client ID and Client Secret

Environment variables
Create a `.env` file in the project root with the following keys (example):

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/mydb?retryWrites=true&w=majority
JWT_SECRET=a-strong-random-secret
PORT=3000
SESSION_SECRET=a-different-session-secret
# Adjust variable names to match what your code expects if different.

Google OAuth setup
1. Go to https://console.developers.google.com/ and create (or use) a project.
2. Under "APIs & Services" → "Credentials", create an OAuth 2.0 Client ID.
3. Set the Authorized redirect URI(s) to the route in your app that handles the OAuth callback, for example:
   - http://localhost:3000/auth/google/callback
4. Copy the Client ID and Client Secret into your `.env`.

Install and run
1. Install dependencies:
   npm install
   # or
   yarn install

2. Start the app:
   npm start
   # or
   node index.js

3. Open http://localhost:3000 (or the PORT you configured) and test sign-in.

Notes and tips
- Make sure `.env` is never committed to your repo; keep secrets out of source control.
- Use strong values for JWT_SECRET and SESSION_SECRET.
- For production, enable HTTPS and configure proper cookie/security settings.
- If you change environment variable names in your code, update the example `.env` accordingly.

License
- Add your preferred license here (e.g., MIT). This project currently has no license file.

Contact
- Repo owner: @ramkumar-lpu
