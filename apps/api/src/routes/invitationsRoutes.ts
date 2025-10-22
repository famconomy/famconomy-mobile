import express from 'express';
import { createInvitation, acceptInvitation, getInvitationDetails, getPendingInvitations, declineInvitation } from '../controllers/invitationsController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public route to get invitation details
router.get('/details', getInvitationDetails);

// Get pending invitations for the authenticated user
router.get('/pending', authenticateToken, getPendingInvitations);

// Public route to accept an invitation
router.post('/accept', optionalAuthenticateToken, acceptInvitation);

// Public route to decline an invitation
router.post('/decline', declineInvitation);

// Protected route to create an invitation
router.post('/', authenticateToken, createInvitation);

export default router;