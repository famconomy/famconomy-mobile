# Native OAuth Setup for FamConomy Mobile (Xcode)

## 📋 Prerequisites

Before starting, gather these credentials:

1. **Google OAuth Client ID** - from Google Cloud Console
2. **Microsoft Client ID & Redirect URI** - from Azure App Registration
3. **Facebook App ID** - from Facebook Developer Console
4. **Apple Sign-In Certificate** - from Apple Developer Account

---

## 🔧 Step 1: Install Dependencies

```bash
cd FamConomy/mobile
npm install
cd ios
pod install
cd ..
```

---

## 🍎 Step 2: Configure Google Sign-In (iOS)

### 2.1 Get Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Choose **iOS** as application type
5. Bundle ID: `com.famconomy.mobile`
6. Get your **Client ID** (looks like: `XXX.apps.googleusercontent.com`)

### 2.2 Download GoogleService-Info.plist

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Download the **GoogleService-Info.plist** file
3. Add to Xcode:
   - Open `ios/Mobile.xcworkspace` in Xcode
   - Right-click **Mobile** project → **Add Files to Mobile**
   - Select `GoogleService-Info.plist`
   - ✅ Check "Copy items if needed"

### 2.3 Configure Google Sign-In

```bash
cd ios
pod deintegrate
pod install
cd ..
```

---

## 🔷 Step 3: Configure Microsoft Sign-In

### 3.1 Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Name: `FamConomy Mobile`
4. Supported account types: `Accounts in any organizational directory`
5. Click **Register**

### 3.2 Add iOS Platform

1. In your app registration, go to **Authentication**
2. Click **Add a platform** → **iOS**
3. Bundle ID: `com.famconomy.mobile`
4. Copy the **Redirect URI** (e.g., `msauth.com.famconomy.mobile://auth`)
5. Click **Configure**

### 3.3 Get Client ID

1. Go to **Overview** tab
2. Copy **Application (client) ID**
3. Set as environment variable:

```bash
export REACT_APP_MICROSOFT_CLIENT_ID="your-client-id"
export REACT_APP_MICROSOFT_REDIRECT_URL="msauth.com.famconomy.mobile://auth"
```

---

## 🍎 Step 4: Configure Apple Sign-In

### 4.1 Apple Developer Account Setup

1. Go to [Apple Developer](https://developer.apple.com)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Create new identifier:
   - Type: **App IDs**
   - Description: `FamConomy Mobile`
   - Bundle ID: `com.famconomy.mobile`
   - Capabilities: Enable **Sign in with Apple**
4. Click **Continue** → **Register**

### 4.2 Xcode Configuration

1. Open `ios/Mobile.xcworkspace` in Xcode
2. Select **Mobile** project → **Signing & Capabilities**
3. Click **+ Capability** → Add **Sign in with Apple**
4. Ensure Team ID is set correctly

### 4.3 Enable in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. **Authentication** → **Sign-in method**
4. Enable **Apple** (if using Firebase auth)

---

## 📘 Step 5: Configure Facebook Sign-In

### 5.1 Facebook Developer Setup

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create new app (if needed)
3. Add **iOS** platform:
   - Bundle ID: `com.famconomy.mobile`
   - Main class: `com.famconomy.Mobile` (or your main Activity)
4. Go to **Settings** → **Basic**
5. Copy **App ID** and **App Secret**

### 5.2 Configure in Xcode

1. Open `ios/Mobile.xcworkspace`
2. Select **Mobile** project
3. Go to **Info** tab
4. Under **URL Types**, add new URL type:
   - Identifier: `facebook`
   - URL Schemes: `fb{YOUR_APP_ID}` (e.g., `fb123456789`)

---

## 🔑 Step 6: Environment Variables

Create `.env.local` in the mobile directory:

```bash
REACT_APP_GOOGLE_IOS_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
REACT_APP_GOOGLE_WEB_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
REACT_APP_MICROSOFT_CLIENT_ID="YOUR_MICROSOFT_CLIENT_ID"
REACT_APP_MICROSOFT_REDIRECT_URL="msauth.com.famconomy.mobile://auth/redirect"
REACT_APP_FACEBOOK_APP_ID="YOUR_FACEBOOK_APP_ID"
REACT_APP_FACEBOOK_REDIRECT_URL="https://www.facebook.com/connect/login_success.html"
REACT_APP_API_BASE_URL="https://famconomy.com/api"
```

> **Server configuration:** Microsoft and Facebook secrets now live on the backend.
> Make sure the API process has `MICROSOFT_CLIENT_SECRET` / `FACEBOOK_APP_SECRET`
> along with the matching redirect URIs (`MICROSOFT_MOBILE_REDIRECT_URI`,
> `FACEBOOK_REDIRECT_URI`) so it can exchange authorization codes for tokens.

---

## 🏗️ Step 7: Build & Run in Xcode

```bash
# Open workspace (NOT .xcodeproj)
open ios/Mobile.xcworkspace

# Or build from command line
xcodebuild -workspace ios/Mobile.xcworkspace \
  -scheme Mobile \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator'
```

---

## 🧪 Testing

1. Start Metro:
   ```bash
   npm start
   ```

2. Open app in simulator

3. Try each OAuth provider:
   - **Google** - Should open native Google login
   - **Apple** - Should open native Apple Sign-In
   - **Microsoft** - Should open Microsoft login flow
   - **Facebook** - Should open Facebook login

4. Check console logs:
   ```
   [API] POST /auth/oauth/google
   [API Response] 200 /auth/oauth/google
   ```

---

## 🐛 Troubleshooting

### Google Sign-In Not Working

- Verify bundle ID matches (`com.famconomy.mobile`)
- Check `GoogleService-Info.plist` is added to Xcode
- Run `pod install` after updating

### Apple Sign-In Not Working

- Check capability is enabled in Xcode
- Verify Team ID is set
- May need to rebuild `pods`

### Microsoft Not Working

- Verify redirect URL in Azure matches app config
- Check client ID is set in environment

### Facebook Not Working

- Verify URL Scheme is set in Info.plist
- Check App ID format: `fb{ID}`

---

## 📱 Production Checklist

- [ ] All OAuth credentials configured
- [ ] Environment variables set
- [ ] Pods installed and updated
- [ ] URL schemes added to Info.plist
- [ ] Signing certificates configured
- [ ] Tested on physical device
- [ ] Deep linking working for callbacks

---

## 🚀 Next Steps

1. Configure production backend URL
2. Test full login flow with backend
3. Set up analytics/crash reporting
4. Configure push notifications
5. Prepare for App Store submission
