import passport from 'passport';
import dotenv from 'dotenv';
dotenv.config();
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import mongoose from 'mongoose';
import User from '../models/User.js';

// if mongoose isn't connected elsewhere, try to connect using env
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/google-auth';
if (mongoose.connection.readyState === 0) {
    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('MongoDB connected from auths/google.js'))
        .catch(err => console.error('MongoDB connection error (auth):', err));
}

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || process.env.Google_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.Google_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL || process.env.Callback_URL || '/auth/google/callback'
    },
    async function(accessToken, refreshToken, profile, cb) {
        try {
            // try find by googleId first
            let user = await User.findOne({ googleId: profile.id });
            if (!user && profile.emails && profile.emails.length) {
                // try find by email to avoid duplicate accounts
                user = await User.findOne({ email: profile.emails[0].value });
            }
            if (!user) {
                user = await User.create({
                    googleId: profile.id,
                    displayName: profile.displayName,
                    emails: profile.emails || [],
                    photos: profile.photos || [],
                    email: profile.emails?.[0]?.value
                });
            } else {
                // update missing fields
                let changed = false;
                if (!user.googleId) { user.googleId = profile.id; changed = true; }
                if (!user.displayName && profile.displayName) { user.displayName = profile.displayName; changed = true; }
                if ((!user.photos || user.photos.length === 0) && profile.photos) { user.photos = profile.photos; changed = true; }
                if (changed) await user.save();
            }
            return cb(null, user);
        } catch (err) {
            return cb(err);
        }
    }
));

passport.serializeUser(function(user, done) {
    // store only user's DB id in session
    done(null, user._id || user.id || user);
});

passport.deserializeUser(async function(id, done) {
    try {
        // id may already be an object
        if (!id) return done(null, null);
        const user = await User.findById(id).lean();
        done(null, user || id);
    } catch (err) {
        done(err);
    }
});