import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import 'dotenv/config';
import {
  getOAuthCallbackUrl,
  resolveFacebookClientId,
  resolveFacebookClientSecret,
  resolveApplePrivateKeyLocation,
  readEnvValue,
} from './utils/urlConfig';
import { downloadRemoteProfilePhoto } from './utils/profilePhoto';

const requireEnv = (value: string | undefined, message: string): string => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const PROFILE_PHOTO_MAX_LENGTH = 100;

const normalizePhotoUrl = (value?: string | null, maxLength = PROFILE_PHOTO_MAX_LENGTH): string | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
};

const resolveProfilePhotoUrl = async (
  rawUrl: string | undefined,
  provider: string,
  providerUserId: string | number | undefined
): Promise<string | undefined> => {
  const downloaded = await downloadRemoteProfilePhoto(rawUrl, provider, providerUserId ?? 'unknown');
  if (downloaded) {
    return downloaded;
  }
  return normalizePhotoUrl(rawUrl);
};

const googleClientId = requireEnv(readEnvValue('GOOGLE_CLIENT_ID'), 'GOOGLE_CLIENT_ID is required for Google OAuth');
const googleClientSecret = requireEnv(readEnvValue('GOOGLE_CLIENT_SECRET'), 'GOOGLE_CLIENT_SECRET is required for Google OAuth');

const facebookClientId = requireEnv(
  resolveFacebookClientId(),
  'FACEBOOK_APP_ID or FACEBOOK_CLIENT_ID is required for Facebook OAuth'
);
const facebookClientSecret = requireEnv(
  resolveFacebookClientSecret(),
  'FACEBOOK_APP_SECRET or FACEBOOK_CLIENT_SECRET is required for Facebook OAuth'
);

const appleClientId = requireEnv(readEnvValue('APPLE_CLIENT_ID'), 'APPLE_CLIENT_ID is required for Sign in with Apple');
const appleTeamId = requireEnv(readEnvValue('APPLE_TEAM_ID'), 'APPLE_TEAM_ID is required for Sign in with Apple');
const appleKeyId = requireEnv(readEnvValue('APPLE_KEY_ID'), 'APPLE_KEY_ID is required for Sign in with Apple');
const applePrivateKeyLocation = requireEnv(
  resolveApplePrivateKeyLocation(),
  'APPLE_PRIVATE_KEY_LOCATION or APPLE_PRIVATE_KEY_PATH is required for Sign in with Apple'
);

const microsoftClientId = requireEnv(
  readEnvValue('MICROSOFT_CLIENT_ID'),
  'MICROSOFT_CLIENT_ID is required for Microsoft OAuth'
);
const microsoftClientSecret = requireEnv(
  readEnvValue('MICROSOFT_CLIENT_SECRET'),
  'MICROSOFT_CLIENT_SECRET is required for Microsoft OAuth'
);

const googleCallbackUrl = getOAuthCallbackUrl('google');
const facebookCallbackUrl = getOAuthCallbackUrl('facebook');
const appleCallbackUrl = getOAuthCallbackUrl('apple');
const microsoftCallbackUrl = getOAuthCallbackUrl('microsoft');

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: googleClientId,
  clientSecret: googleClientSecret,
  callbackURL: googleCallbackUrl,
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'], // Add calendar scope
}, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("No email found in profile"));
    }
    let user = await prisma.users.findUnique({ where: { Email: email } });

    const photoUrl = await resolveProfilePhotoUrl(profile.photos?.[0]?.value, 'google', profile?.id);

    if (!user) {
      user = await prisma.users.create({
        data: {
          Email: email,
          FirstName: profile.name?.givenName || '',
          LastName: profile.name?.familyName || '',
          ProfilePhotoUrl: photoUrl ?? null,
          PasswordHash: 'oauth_account_no_password_set',
          googleAccessToken: accessToken, // Store accessToken
          googleRefreshToken: refreshToken, // Store refreshToken
        }
      });
    } else {
      // Update existing user with new tokens (tokens can expire and be refreshed)
      const updateData: any = {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
      };
      if (photoUrl) {
        updateData.ProfilePhotoUrl = photoUrl;
      }
      user = await prisma.users.update({
        where: { UserID: user.UserID },
        data: updateData,
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
    clientID: facebookClientId,
    clientSecret: facebookClientSecret,
    callbackURL: facebookCallbackUrl,
    profileFields: ['id', 'displayName', 'emails', 'name', 'photos']
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in profile"));
        }
        let user = await prisma.users.findUnique({ where: { Email: email } });
    
        const photoUrl = await resolveProfilePhotoUrl(profile.photos?.[0]?.value, 'facebook', profile?.id);

        if (!user) {
          user = await prisma.users.create({
            data: {
              Email: email,
              FirstName: profile.name?.givenName || '',
              LastName: profile.name?.familyName || '',
              ProfilePhotoUrl: photoUrl ?? null,
              PasswordHash: 'oauth_account_no_password_set',
              facebookAccessToken: accessToken,
              facebookRefreshToken: refreshToken,
            }
          });
        } else {
          const updateData: any = {
            facebookAccessToken: accessToken,
            facebookRefreshToken: refreshToken,
          };
          if (photoUrl) {
            updateData.ProfilePhotoUrl = photoUrl;
          }
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: updateData,
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
    clientID: appleClientId,
    teamID: appleTeamId,
    keyID: appleKeyId,
    privateKeyLocation: applePrivateKeyLocation,
    callbackURL: appleCallbackUrl,
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
    clientID: microsoftClientId,
    clientSecret: microsoftClientSecret,
    callbackURL: microsoftCallbackUrl,
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
    
        const photoUrl = await resolveProfilePhotoUrl(profile.photos?.[0]?.value, 'microsoft', profile?.id);

        if (!user) {
          user = await prisma.users.create({
            data: {
              Email: email,
              FirstName: profile.name?.givenName || '',
              LastName: profile.name?.familyName || '',
              ProfilePhotoUrl: photoUrl ?? null,
              PasswordHash: 'oauth_account_no_password_set',
              microsoftAccessToken: accessToken,
              microsoftRefreshToken: refreshToken,
            }
          });
        } else {
          const updateData: any = {
            microsoftAccessToken: accessToken,
            microsoftRefreshToken: refreshToken,
          };
          if (photoUrl) {
            updateData.ProfilePhotoUrl = photoUrl;
          }
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: updateData,
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
