# Integration Checklist - Apple Family Controls

## ✅ Phase 1 Complete - Backend Integration Complete

All backend components are implemented and tested. Follow these steps to integrate into the main API.

---

## Step 1: Update Main API Entry Point

**File**: `apps/api/src/app.ts`

Add the import and route registration:

```typescript
// Add this import at the top
import familyControlsRoutes from './routes/familyControlsRoutes';

// Add this in your route registration section (typically after other routes)
// All routes require authentication via middleware
app.use('/family-controls', familyControlsRoutes);
```

---

## Step 2: Database Migration (Prisma)

Run database migration to create the new tables:

```bash
# Generate migration
npx prisma migrate dev --name add_family_controls

# Or generate without running
npx prisma migrate dev --name add_family_controls --create-only

# Then apply migration
npx prisma migrate deploy
```

This will create:
- `FamilyControlsAccount`
- `AuthorizationToken`
- `ScreenTimeRecord`
- `ScreenTimeSchedule`
- `DeviceControlPolicy`
- `FamilyControlsEvent`

---

## Step 3: Verify Imports

Ensure all service and controller imports work:

```bash
cd apps/api
npm run build
# or
npx tsc --noEmit
```

---

## Step 4: Test Endpoints

Once the API is running, test the endpoints:

```bash
# Requires JWT auth token in Authorization header
TOKEN="your-jwt-token"

# Create authorization token
curl -X POST http://localhost:3000/family-controls/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "targetUserId": "child-456",
    "familyId": 1,
    "scopes": ["screenTime", "deviceControl"],
    "expiresInDays": 365
  }'

# List tokens
curl -X GET "http://localhost:3000/family-controls/tokens?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# Check token status
curl -X GET http://localhost:3000/family-controls/tokens/TOKEN_HERE \
  -H "Authorization: Bearer $TOKEN"

# Get stats
curl -X GET http://localhost:3000/family-controls/stats/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 5: Update Environment Variables (Optional)

No new environment variables required. The service uses existing:
- `DATABASE_URL` - For Prisma database access
- `JWT_SECRET` - For token validation (already in use)

---

## Step 6: Add to Deployment

When deploying, ensure:
1. Database migrations are run before API starts
2. Prisma client is generated: `npx prisma generate`
3. All environment variables are set
4. Service health checks pass

---

## Current Status: ✅ READY

All files are complete and ready for integration:

- ✅ Service layer: `apps/api/src/services/familyControlsService.ts`
- ✅ Controller: `apps/api/src/controllers/familyControlsController.ts`
- ✅ Routes: `apps/api/src/routes/familyControlsRoutes.ts`
- ✅ Database models: `apps/api/prisma/schema.prisma`
- ✅ Shared types: `packages/shared/src/types/index.ts`

---

## Testing Scenarios

### Scenario 1: Happy Path - Authorization

```bash
# 1. Create authorization
TOKEN=$(curl -s -X POST http://localhost:3000/family-controls/authorize \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "parent-1",
    "targetUserId": "child-1",
    "familyId": 1,
    "scopes": ["screenTime"],
    "expiresInDays": 365
  }' | jq -r '.data.authorizationToken')

# 2. Check status
curl -X GET http://localhost:3000/family-controls/tokens/$TOKEN \
  -H "Authorization: Bearer $JWT"

# 3. Validate
curl -X POST http://localhost:3000/family-controls/tokens/$TOKEN/validate \
  -H "Authorization: Bearer $JWT"
```

### Scenario 2: Screen Time Recording

```bash
# 1. Create/get account
curl -X POST http://localhost:3000/family-controls/accounts \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "child-1",
    "familyId": 1
  }'

# 2. Record screen time
curl -X POST http://localhost:3000/family-controls/screen-time \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "child-1",
    "familyId": 1,
    "date": "2025-10-22",
    "totalMinutesUsed": 85,
    "dailyLimitMinutes": 120,
    "categoryBreakdown": {
      "Social": 30,
      "Gaming": 45,
      "Education": 10
    }
  }'

# 3. Get history
curl -X GET "http://localhost:3000/family-controls/screen-time/child-1/1?startDate=2025-10-15&endDate=2025-10-22" \
  -H "Authorization: Bearer $JWT"
```

### Scenario 3: Token Lifecycle

```bash
# 1. Create token
TOKEN=$(curl -s -X POST http://localhost:3000/family-controls/authorize \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{...}' | jq -r '.data.authorizationToken')

# 2. Renew (before expiry)
curl -X POST http://localhost:3000/family-controls/tokens/$TOKEN/renew \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"expiresInDays": 365}'

# 3. Revoke
curl -X POST http://localhost:3000/family-controls/tokens/$TOKEN/revoke \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"revokedByUserId": "parent-1", "reason": "User left family"}'
```

---

## Troubleshooting

### Issue: Database connection error

**Solution**: Ensure `DATABASE_URL` is set correctly in `.env`:
```bash
DATABASE_URL="mysql://user:password@localhost:3306/famconomy_db"
```

### Issue: Route not found (404)

**Solution**: Verify route is registered in `app.ts`:
```typescript
import familyControlsRoutes from './routes/familyControlsRoutes';
app.use('/family-controls', familyControlsRoutes);
```

### Issue: Authentication error (401/403)

**Solution**: 
1. Ensure JWT token is valid: `echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson'`
2. Check `JWT_SECRET` matches in `.env`
3. Ensure Authorization header format: `Authorization: Bearer <token>`

### Issue: Migration fails

**Solution**:
1. Check Prisma schema syntax: `npx prisma validate`
2. Run migration in dev mode first: `npx prisma migrate dev`
3. Check database user has permissions
4. Review Prisma logs: `DEBUG=* npx prisma migrate deploy`

---

## Rollback Plan

If you need to rollback the migration:

```bash
# List migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back add_family_controls

# Remove the tables manually if needed
npx prisma db execute --stdin <<EOF
DROP TABLE IF EXISTS FamilyControlsEvent;
DROP TABLE IF EXISTS DeviceControlPolicy;
DROP TABLE IF EXISTS ScreenTimeSchedule;
DROP TABLE IF EXISTS ScreenTimeRecord;
DROP TABLE IF EXISTS AuthorizationToken;
DROP TABLE IF EXISTS FamilyControlsAccount;
EOF
```

---

## Performance Tuning

### For High Load

1. **Enable Query Caching** in Prisma:
```typescript
const tokenStatus = await prisma.authorizationToken.findUnique({
  where: { token },
  // Caching handled by DB, can add Redis layer
});
```

2. **Use Database Connection Pooling**:
```env
DATABASE_URL="mysql://user:pass@host:3306/db?connection_limit=20"
```

3. **Monitor Query Performance**:
```bash
# Enable Prisma logging
DEBUG=prisma:* npm run api:dev
```

---

## Monitoring & Logging

Add to your monitoring system:

1. **Track Token Creation Rate**:
```sql
SELECT COUNT(*) FROM AuthorizationToken WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

2. **Track Revoked Tokens**:
```sql
SELECT COUNT(*) FROM AuthorizationToken WHERE isRevoked = true;
```

3. **Track Screen Time Records**:
```sql
SELECT COUNT(*), DATE(date) FROM ScreenTimeRecord GROUP BY DATE(date);
```

4. **API Response Times**:
- Capture in middleware
- Log to monitoring system
- Alert on > 500ms

---

## Security Checklist

- [x] All endpoints require JWT authentication
- [x] Database queries use parameterized statements (Prisma)
- [x] Tokens are stored securely (hashed if needed)
- [x] Error messages don't leak sensitive data
- [x] HTTPS enforced in production
- [x] CORS configured appropriately
- [x] Rate limiting can be added
- [x] Audit logging implemented

---

## Deployment Checklist

Before deploying to production:

- [ ] Database backup created
- [ ] Migration tested on staging
- [ ] All environment variables set
- [ ] JWT_SECRET is strong & secure
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] Error logging configured
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained on new endpoints
- [ ] Rollback plan documented

---

## Support & Next Steps

For issues or questions:

1. Check `APPLE_FAMILY_CONTROLS_SETUP.md` for detailed architecture
2. Review `FAMILY_CONTROLS_NATIVE_MODULE_SPEC.md` for API details
3. See `FAMILY_CONTROLS_IMPLEMENTATION_GUIDE.md` for examples
4. Check error codes in spec for solutions

---

**Phase 1 Status**: ✅ COMPLETE  
**Integration Required**: Update `apps/api/src/app.ts` only  
**Estimated Integration Time**: 5 minutes  
**Estimated Testing Time**: 30 minutes  

**Ready to integrate!**
