import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import 'dotenv/config';

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'https://famconomy.com/api/auth/google/callback',
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'], // Add calendar scope
}, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("No email found in profile"));
    }
    let user = await prisma.users.findUnique({ where: { Email: email } });

    if (!user) {
      user = await prisma.users.create({
        data: {
          Email: email,
          FirstName: profile.name?.givenName || '',
          LastName: profile.name?.familyName || '',
          ProfilePhotoUrl: profile.photos?.[0]?.value || '',
          PasswordHash: 'oauth_account_no_password_set',
          googleAccessToken: accessToken, // Store accessToken
          googleRefreshToken: refreshToken, // Store refreshToken
        }
      });
    } else {
      // Update existing user with new tokens (tokens can expire and be refreshed)
      user = await prisma.users.update({
        where: { UserID: user.UserID },
        data: {
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        },
      });
    }

    const token = jwt.sign({ id: user.UserID }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    done(null, { token });
  } catch (err) {
    done(err, null);
  }
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    callbackURL: "https://famconomy.com/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails', 'name']
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in profile"));
        }
        let user = await prisma.users.findUnique({ where: { Email: email } });
    
        if (!user) {
          user = await prisma.users.create({
            data: {
              Email: email,
              FirstName: profile.name?.givenName || '',
              LastName: profile.name?.familyName || '',
              ProfilePhotoUrl: profile.photos?.[0]?.value || '',
              PasswordHash: 'oauth_account_no_password_set',
              facebookAccessToken: accessToken,
              facebookRefreshToken: refreshToken,
            }
          });
        } else {
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: {
              facebookAccessToken: accessToken,
              facebookRefreshToken: refreshToken,
            },
          });
        }
    
        const token = jwt.sign({ id: user.UserID }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        done(null, { token });
      } catch (err) {
        done(err, null);
      }
  }
));

// Apple Strategy
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID!,
    teamID: process.env.APPLE_TEAM_ID!,
    keyID: process.env.APPLE_KEY_ID!,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION!,
    callbackURL: "https://famconomy.com/api/auth/apple/callback",
    scope: ['name', 'email'],
    passReqToCallback: true
},
async (req: any, accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => {
    try {
        const extractAppleEmail = (): string | undefined => {
          if (profile?.email) return profile.email;
          if (profile?._json?.email) return profile._json.email;
          if (idToken && typeof idToken === 'object' && 'email' in idToken) {
            return (idToken as any).email;
          }
          if (typeof idToken === 'string') {
            const parts = idToken.split('.');
            if (parts.length === 3) {
              try {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                return payload?.email;
              } catch (error) {
                console.error('Failed to decode Apple idToken payload', error);
              }
            }
          }
          return undefined;
        };

        const email = extractAppleEmail();
        if (!email) {
          return done(new Error("No email found in profile"));
        }

        const rawUser = req.body?.user;
        let parsedUser: any = rawUser;
        if (typeof rawUser === 'string') {
          try {
            parsedUser = JSON.parse(rawUser);
          } catch (error) {
            console.error('Failed to parse Apple user payload', error);
            parsedUser = null;
          }
        }

        const firstName = parsedUser?.name?.firstName || profile?.name?.firstName || profile?.name?.givenName || '';
        const lastName = parsedUser?.name?.lastName || profile?.name?.lastName || profile?.name?.familyName || '';

        let user = await prisma.users.findUnique({ where: { Email: email } });

        if (!user) {
          user = await prisma.users.create({
            data: {
              Email: email,
              FirstName: firstName,
              LastName: lastName,
              ProfilePhotoUrl: '',
              PasswordHash: 'oauth_account_no_password_set',
              appleAccessToken: accessToken,
              appleRefreshToken: refreshToken,
            }
          });
        } else {
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: {
              appleAccessToken: accessToken,
              appleRefreshToken: refreshToken,
            },
          });
        }
    
        const token = jwt.sign({ id: user.UserID }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        done(null, { token });
      } catch (err) {
        done(err, null);
      }
}));

// Microsoft Strategy
passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    callbackURL: "https://famconomy.com/api/auth/microsoft/callback",
    scope: ['user.read']
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
        const email = profile.emails?.[0]?.value
          || profile._json?.mail
          || profile._json?.userPrincipalName;
        if (!email) {
          return done(new Error("No email found in profile"));
        }
        let user = await prisma.users.findUnique({ where: { Email: email } });
    
        if (!user) {
          user = await prisma.users.create({
            data: {
              Email: email,
              FirstName: profile.name?.givenName || '',
              LastName: profile.name?.familyName || '',
              ProfilePhotoUrl: profile.photos?.[0]?.value || '',
              PasswordHash: 'oauth_account_no_password_set',
              microsoftAccessToken: accessToken,
              microsoftRefreshToken: refreshToken,
            }
          });
        } else {
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: {
              microsoftAccessToken: accessToken,
              microsoftRefreshToken: refreshToken,
            },
          });
        }
    
        const token = jwt.sign({ id: user.UserID }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        done(null, { token });
      } catch (err) {
        done(err, null);
      }
  }
));

export default passport;
