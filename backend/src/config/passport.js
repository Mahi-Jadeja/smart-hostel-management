import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './env.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import logger from './logger.js';

const setupPassport = () => {
  // Only setup Google OAuth if credentials are provided
  // This way the app still works without Google OAuth configured
  if (!config.google.clientId || !config.google.clientSecret) {
    logger.warn('Google OAuth credentials not configured. Google login disabled.');
    return;
  }

  // Tell Passport to use the Google OAuth 2.0 strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        // scope tells Google what information we want access to
      },
      // This function is called AFTER Google authenticates the user
      // Google gives us the profile data, and we decide what to do with it
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract info from Google profile
          const googleId = profile.id;
          const email = profile.emails[0].value.toLowerCase();
          const name = profile.displayName;

          // Check if user already exists (by Google ID or email)
          let user = await User.findOne({
            $or: [
              { googleId: googleId },
              { email: email },
            ],
          });
          // $or: [...] is a MongoDB operator that matches if ANY condition is true
          // We check both googleId AND email because:
          // - Maybe they registered with email first, then tried Google login
          // - Maybe they logged in with Google first

          if (user) {
            // User exists — update Google ID if not set
            // (handles the case where they registered with email first)
            if (!user.googleId) {
              user.googleId = googleId;
              user.provider = 'google';
              await user.save();
            }
          } else {
            // User doesn't exist — create new user
            user = await User.create({
              name,
              email,
              googleId,
              provider: 'google',
              role: 'student', // ALWAYS student via OAuth
              // No password — Google handles authentication
            });

            // Create Student profile
            await Student.create({
              user_id: user._id,
              name: user.name,
              email: user.email,
            });
          }

          // done(null, user) tells Passport: "Authentication succeeded, here's the user"
          // done(error) would tell Passport: "Authentication failed"
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};

export default setupPassport;