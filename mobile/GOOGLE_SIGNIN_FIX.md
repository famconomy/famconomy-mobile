# Google Sign-In iOS Setup - Complete Guide

## ❌ Error Message
```
RNGoogleSignin: failed to determine clientID - GoogleService-Info.plist was not found 
and iosClientId was not provided
```

## ✅ What This Means
The React Native Google Sign-In library can't find your Google OAuth credentials. We need to provide them one of these ways:
1. Add `GoogleService-Info.plist` to the Xcode project (recommended)
2. Set `REACT_APP_GOOGLE_IOS_CLIENT_ID` environment variable

---

## 🔧 Solution: Add GoogleService-Info.plist to Xcode

### Step 1: Create Firebase Project & Get Plist

1. Visit [Firebase Console](https://console.firebase.google.com)
2. Create new project named "FamConomy" or use existing
3. Click **"Add App"** → Choose **iOS**
4. Enter:
   - **Bundle ID:** `com.famconomy.mobile`
   - **App Nickname:** FamConomy Mobile
   - **App Store ID:** (leave blank for now)
5. Click **"Register App"**
6. **Download** the `GoogleService-Info.plist` file
7. Save it somewhere easily accessible (like Desktop)

### Step 2: Add Plist to Xcode Project

1. **Open Xcode:**
   ```bash
   open FamConomy/mobile/ios/Mobile.xcworkspace
   ```
   ⚠️ Use **`.xcworkspace`** NOT `.xcodeproj`

2. In Xcode's **Project Navigator** (left sidebar):
   - Right-click the **"Mobile"** folder (blue icon)
   - Select **"Add Files to 'Mobile'..."**

3. Browse and select the `GoogleService-Info.plist` file

4. In the dialog that appears:
   - ✅ Check **"Copy items if needed"**
   - ✅ Check **"Add to targets: Mobile"**
   - Click **"Add"**

5. **Verify it's in the build phases:**
   - Select the `Mobile` project in navigator
   - Select `Mobile` target
   - Go to **"Build Phases"** tab
   - Expand **"Copy Bundle Resources"**
   - Should see `GoogleService-Info.plist` listed ✅

### Step 3: Rebuild and Test

```bash
# Terminal 1: Start Metro bundler
cd FamConomy/mobile
npm start

# Terminal 2: Clean and rebuild iOS
cd FamConomy/mobile/ios
rm -rf Pods Podfile.lock
pod install

# Terminal 3: In Xcode
# - Select "Mobile" scheme (top left dropdown)
# - Select "iPhone 16 Pro" simulator
# - Press ▶️ (Play button) to run
```

---

## 🌐 Alternative: Environment Variable Setup

If you prefer not to commit the plist file to git, use environment variables:

### Step 1: Get Your iOS Client ID

In the `GoogleService-Info.plist` file you downloaded:
```xml
<key>CLIENT_ID</key>
<string>YOUR_CLIENT_ID_HERE.apps.googleusercontent.com</string>
```

Extract the `CLIENT_ID` value.

### Step 2: Create `.env` File

Create `FamConomy/mobile/.env`:
```bash
REACT_APP_GOOGLE_IOS_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
REACT_APP_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com
REACT_APP_API_BASE_URL=https://famconomy.com/api
```

### Step 3: Rebuild
```bash
cd FamConomy/mobile
npm start  # This will automatically pick up .env
```

---

## 🔑 Reference: Your Current Configuration

From `app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.famconomy.mobile",
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLName": "google",
          "CFBundleURLSchemes": [
            "com.googleusercontent.apps.328667852218-ofk3l0s1vu2n8k6sgdggl3dvcvlvk02e"
          ]
        }
      ]
    }
  }
}
```

This OAuth URL scheme (`com.googleusercontent.apps.328667852218-ofk3l0s1vu2n8k6sgdggl3dvcvlvk02e`) tells iOS to recognize and handle Google's OAuth redirects.

---

## 🐛 Debugging

### If Still Getting Error After Adding Plist

1. **Clean everything:**
   ```bash
   cd FamConomy/mobile/ios
   rm -rf Pods Podfile.lock build
   pod install
   ```

2. **In Xcode:**
   - Product → Clean Build Folder (`Cmd+Shift+K`)
   - Product → Build (`Cmd+B`) to verify it compiles
   - Check Build Phases → Copy Bundle Resources (should list GoogleService-Info.plist)

3. **Check Console Logs:**
   - Run the app
   - Press `j` in Metro terminal to open React Native DevTools
   - Look for logs like:
     ```
     [OAuth] Using Google iOS Client ID from oauthConfig
     [OAuth] Configuring Google Sign-In...
     [OAuth] Triggering Google Sign-In sheet...
     ```

### Verify Google Sign-In Works

Try these test credentials in Firebase:
```
Email: test@gmail.com
Password: (Firebase test account)
```

---

## 📋 Checklist

- [ ] Downloaded `GoogleService-Info.plist` from Firebase Console
- [ ] Added plist file to Xcode project (to Mobile target)
- [ ] Verified file appears in Build Phases → Copy Bundle Resources
- [ ] Cleaned build folder and rebuilt (`Cmd+Shift+K`)
- [ ] Metro bundler running (`npm start`)
- [ ] Xcode app running on iPhone 16 Pro simulator
- [ ] Google Sign-In button appears and is clickable
- [ ] Can see OAuth flow logs in Metro DevTools (`j` key)

---

## 🆘 Still Having Issues?

### Common Problems

| Problem | Solution |
|---------|----------|
| `GoogleService-Info.plist was not found` | Added plist to Xcode but rebuild | Add to correct target, clean build folder, rebuild |
| `TurboModuleRegistry.getEnforcing` error | Plist added but not in Bundle Resources | Check Build Phases, might need to add manually |
| OAuth sheet won't appear | Check console logs for errors | Use `j` in Metro to view React Native DevTools |
| `Cannot find module` errors | Dependencies might not be installed | Run `cd mobile && npm install` |

---

## 📚 Related Files

- **OAuth Config:** `mobile/src/config/oauthConfig.ts`
- **OAuth Service:** `mobile/src/services/oauthService.ts`
- **Login Component:** `mobile/src/app/screens/Login.tsx`
- **App Config:** `mobile/app.json`
- **Auth Hook:** `mobile/src/hooks/useAuth.ts`
- **API Client:** `mobile/src/api/apiClient.ts`

---

## ✨ Next Steps After Setup

1. Test email/password login (simpler, no OAuth needed)
2. Test Google OAuth flow
3. Configure other providers (Apple, Microsoft, Facebook)
4. Test full authentication flow end-to-end
5. Implement token persistence and auto-login
