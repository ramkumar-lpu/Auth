import express from 'express';
import passport from 'passport';
import mongoose from 'mongoose';
// connect mongoose early so `auths/google.js` can reuse the connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/google-auth';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected (jwt_Auth)'))
  .catch(err => console.error('MongoDB connection error (jwt_Auth):', err));
import './auths/google.js';
import User from './models/User.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;

// parse JSON/body for future routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));

// Initialize passport
app.use(passport.initialize());

// ---- Google Auth: Start ----
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })
);

// ---- Google OAuth Callback ----
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user;

    if (!user) {
      console.error('No user found on req after Google auth callback');
      return res.status(500).send('Authentication error');
    }

    // use secret from .env (JWT_SECRET). Fallback only for dev.
    const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

    // pick a stable id (mongoose uses _id) or fallback to profile id
    const uid = user._id?.toString?.() || user.id || user.googleId || null;

    const token = jwt.sign(
      {
        id: uid,
        name: user.displayName,
        email: user.emails?.[0]?.value
      },
      SECRET,
      { expiresIn: '1d' }
    );

    // Store JWT in cookie. In production set secure=true (HTTPS).
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.redirect('/index.html');
  }
);

// ---- Protected Route: Using JWT ----
app.get("/profile", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(token, SECRET);

    // Try to return the full user document from DB when possible so frontend
    // can render displayName, emails, photos, etc. If user not found, return
    // an empty object (frontend will redirect on 401 or show 'no data').
    if (decoded && decoded.id) {
      const user = await User.findById(decoded.id).lean();
      if (!user) return res.json({});
      return res.json(user);
    }

    // Fallback: return decoded token data
    return res.json(decoded || {});

  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
});

// ---- Local Signup (create user + issue JWT) ----
app.post('/auth/signup', async (req, res, next) => {
  try {
    const { fullname, email, password } = req.body;
    if (!email || !password) return res.status(400).send('Missing email or password');
    // check existing
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).send('User already exists');

    const user = new User({ displayName: fullname || email.split('@')[0], email, password });
    await user.save();

    const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    const uid = user._id.toString();
    const token = jwt.sign({ id: uid, name: user.displayName, email: user.email }, SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.redirect('/profile.html');
  } catch (err) {
    next(err);
  }
});

// ---- Local Login (validate + issue JWT) ----
app.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Missing email or password');

    const user = await User.findOne({ email });
    if (!user) return res.status(401).send('Invalid credentials');

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).send('Invalid credentials');

    const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    const uid = user._id.toString();
    const token = jwt.sign({ id: uid, name: user.displayName, email: user.email }, SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.redirect('/profile.html');
  } catch (err) {
    next(err);
  }
});

// Logout - remove JWT cookie
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/index.html");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
