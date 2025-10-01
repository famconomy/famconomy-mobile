import express from 'express';
import passport from '../passport';
import { registerUser, loginUser, getCurrentUser, checkEmail, requestPasswordReset, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 🔐 Standard Auth Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/check-email', checkEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// 🚪 Logout
router.post('/logout', (req, res) => {
  res.clearCookie('fam_token');
  res.status(200).json({ message: 'Logged out successfully' });
});

// 🌐 Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req: any, res: any) => {
    const { token } = req.user;
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.redirect('https://famconomy.com/app/');
  }
);

// 🌐 Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  (req: any, res: any) => {
    const { token } = req.user;
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.redirect('https://famconomy.com/app/');
  }
);

// 🌐 Apple OAuth
router.get('/apple', passport.authenticate('apple'));

router.post('/apple/callback',
  passport.authenticate('apple', { session: false }),
  (req: any, res: any) => {
    const { token } = req.user;
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.redirect('https://famconomy.com/app/');
  }
);

// 🌐 Microsoft OAuth
router.get('/microsoft', passport.authenticate('microsoft'));

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  (req: any, res: any) => {
    const { token } = req.user;
    res.cookie('fam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.redirect('https://famconomy.com/app/');
  }
);

export default router;
