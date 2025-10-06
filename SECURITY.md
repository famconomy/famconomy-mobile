# FamConomy Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in FamConomy to protect family financial data and ensure proper authorization controls.

## Security Architecture

### 1. Authentication & Authorization

#### JWT Token Security
- **HttpOnly Cookies**: JWT tokens are stored in secure HttpOnly cookies (`fam_token`)
- **Token Expiration**: Configurable token expiration (default: 24 hours)
- **Secure Flag**: Cookies marked as secure in production environments
- **SameSite Protection**: CSRF protection via SameSite cookie attribute

#### Family-Centric Authorization
All family-scoped operations require explicit membership verification:

```typescript
// Example: Budget access requires family membership
const budget = await verifyBudgetAccess(userId, budgetId);
if (!budget) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### 2. Authorization Middleware

#### Middleware Guards
- `requireFamilyMembership()`: Verifies user belongs to requested family
- `requireBudgetAccess()`: Validates user can access specific budget
- `requireTaskAccess()`: Ensures user can access specific task
- `authenticateToken`: Validates JWT token and extracts user ID

#### Route Protection Pattern
```typescript
router.get('/budget/family/:familyId', 
  authenticateToken,
  requireFamilyMembership(),
  budgetController.getBudgetsForFamily
);
```

### 3. Data Access Security

#### Database Authorization
All database queries include authorization checks:

```typescript
// Before: Insecure query
const budgets = await prisma.budget.findMany({ where: { familyId } });

// After: Secure query with membership verification
const budgets = await prisma.budget.findMany({
  where: {
    familyId,
    family: {
      members: { some: { id: userId } }
    }
  }
});
```

#### Input Validation
- Parameter sanitization for all numeric IDs
- Type checking via TypeScript strict mode
- SQL injection prevention through Prisma ORM

### 4. Logging & Observability

#### Structured Logging
The application uses a centralized logging system with automatic sensitive data sanitization:

```typescript
// Automatically redacts sensitive fields
logger.info('User login', { 
  username: 'john',
  password: 'secret123' // Becomes [REDACTED]
});
```

#### Sanitized Fields
The logger automatically redacts:
- `password`, `pass`, `pwd`
- `token`, `jwt`, `accessToken`, `refreshToken`
- `secret`, `key`, `apiKey`, `sessionSecret`
- `clientSecret`, `privateKey`

#### Security Event Logging
```typescript
// Unauthorized access attempts are logged
logger.warn('Unauthorized family access attempt', { 
  userId, 
  familyId, 
  endpoint: req.path 
});
```

### 5. Session Management

#### Session Configuration
```typescript
{
  secret: process.env.SESSION_SECRET, // Required in production
  resave: false,
  saveUninitialized: false,
  name: 'famconomy_session', // Custom session name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict' // In production
  }
}
```

#### Production Requirements
- `SESSION_SECRET` environment variable is mandatory
- Redis session store recommended for scaling
- Memory store not recommended for production

### 6. Environment Security

#### Required Environment Variables
```bash
# Required in production
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# Optional but recommended
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

#### Environment Validation
The application validates required secrets on startup:

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}
```

## Security Test Coverage

### Authorization Tests
- ✅ Family membership verification  
- ✅ Budget access control
- ✅ Task access control
- ✅ Middleware guard functions
- ✅ Input validation edge cases

### Security Features Tested
- User authorization flows
- Database error handling
- Invalid parameter handling
- Malicious input protection

## Production Security Checklist

### Before Deployment
- [ ] Set `JWT_SECRET` environment variable
- [ ] Set `SESSION_SECRET` environment variable  
- [ ] Configure Redis session store
- [ ] Enable HTTPS/SSL certificates
- [ ] Set `NODE_ENV=production`
- [ ] Review CORS origins
- [ ] Audit npm dependencies (`npm audit`)

### Monitoring & Alerts
- [ ] Set up log aggregation (e.g., ELK stack)
- [ ] Monitor failed authentication attempts
- [ ] Alert on suspicious access patterns
- [ ] Track authorization bypass attempts

## Security Best Practices

### For Developers

1. **Always Verify Family Membership**
   ```typescript
   // ✅ Good
   const isMember = await verifyFamilyMembership(userId, familyId);
   if (!isMember) return res.status(403).json({ error: 'Access denied' });
   
   // ❌ Bad - Direct database access without authorization
   const data = await prisma.budget.findMany({ where: { familyId } });
   ```

2. **Use Authorization Middleware**
   ```typescript
   // ✅ Good
   router.get('/api/family/:familyId/data', 
     authenticateToken,
     requireFamilyMembership(),
     controller.getData
   );
   
   // ❌ Bad - No authorization middleware
   router.get('/api/family/:familyId/data', controller.getData);
   ```

3. **Sanitize Logging Data**
   ```typescript
   // ✅ Good - Uses secure logger
   logger.info('User action', { userId, action, timestamp });
   
   // ❌ Bad - May leak sensitive data
   console.log('User data:', { password: user.password });
   ```

4. **Handle Errors Securely**
   ```typescript
   // ✅ Good - Generic error message
   return res.status(500).json({ error: 'Internal server error' });
   
   // ❌ Bad - Leaks implementation details
   return res.status(500).json({ error: error.message });
   ```

### For Operations

1. **Regular Security Updates**
   - Update dependencies monthly: `npm audit fix`
   - Monitor security advisories
   - Test security patches in staging

2. **Access Control**
   - Use least-privilege principle
   - Rotate secrets regularly
   - Monitor admin access logs

3. **Data Protection**
   - Encrypt data at rest
   - Use TLS for data in transit
   - Regular backup validation

## Incident Response

### Security Breach Response
1. **Immediate Actions**
   - Invalidate all active sessions
   - Rotate JWT and session secrets
   - Enable additional logging
   - Document timeline of events

2. **Investigation**
   - Review authorization logs
   - Check for unauthorized data access
   - Identify compromised accounts
   - Assess data exposure scope

3. **Remediation**
   - Patch security vulnerabilities
   - Reset compromised user passwords
   - Enhance monitoring
   - Update security policies

## Compliance & Privacy

### Data Privacy
- Family data isolation enforced at database level
- User consent tracking for data usage
- Data retention policies implemented
- Right to data deletion supported

### Audit Trail
- All family data access logged
- Authorization decisions recorded
- Failed access attempts tracked
- Admin actions audited

---

**Note**: This security implementation follows industry best practices for family financial applications. Regular security reviews and updates are essential to maintain protection against evolving threats.

## Contact

For security questions or to report security issues:
- Security Team: security@famconomy.com
- Urgent Issues: Use encrypted communication channels
- Bug Bounty: Details at famconomy.com/security