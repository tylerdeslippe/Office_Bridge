# TestFlight Setup Guide for Office Bridge

This guide walks you through getting Office Bridge ready for TestFlight alpha testing on iOS.

## Prerequisites

1. **Mac Computer** - Required for iOS development
2. **Xcode 15+** - Download from App Store
3. **Apple Developer Account** ($99/year) - https://developer.apple.com
4. **Node.js 18+** - https://nodejs.org

## Step 1: Initial Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build the web app
npm run build
```

## Step 2: Initialize Capacitor iOS

```bash
# Add iOS platform
npx cap add ios

# Sync web code to native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Step 3: Configure Xcode Project

### 3.1 Set Team & Signing
1. In Xcode, click on "App" in the left sidebar
2. Select the "App" target
3. Go to "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Team from the dropdown
6. Bundle Identifier should be: `com.faithfulandtrue.officebridge`

### 3.2 Set App Version
1. Still in the target settings
2. Go to "General" tab
3. Set Version: `1.0.0`
4. Set Build: `1`

### 3.3 Configure Permissions
The Info.plist needs these permissions (Capacitor should add these automatically, but verify):

```xml
<key>NSCameraUsageDescription</key>
<string>Office Bridge needs camera access to take photos for daily reports and documentation.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Office Bridge needs photo library access to upload existing photos.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Office Bridge needs location access to auto-fill job site addresses and track deliveries.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Office Bridge needs location access for delivery tracking notifications.</string>
```

### 3.4 Add App Icons
1. In Xcode, open `App > Assets.xcassets > AppIcon`
2. Add icons in all required sizes:
   - 20x20 (1x, 2x, 3x)
   - 29x29 (1x, 2x, 3x)
   - 40x40 (1x, 2x, 3x)
   - 60x60 (2x, 3x)
   - 76x76 (1x, 2x)
   - 83.5x83.5 (2x)
   - 1024x1024 (App Store)

**Tip**: Use https://appicon.co to generate all sizes from a single 1024x1024 image.

### 3.5 Add Splash Screen
1. In Xcode, open `App > Assets.xcassets`
2. Add a `Splash` image set
3. Create a simple splash with your logo on blue (#2563eb) background

## Step 4: Build for TestFlight

### 4.1 Archive the App
1. In Xcode, select "Any iOS Device" as the build target
2. Go to Product > Archive
3. Wait for the build to complete

### 4.2 Upload to App Store Connect
1. When Archive completes, the Organizer window opens
2. Select your archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Choose "Upload"
6. Follow the prompts

### 4.3 Configure in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" > "+" > "New App"
3. Fill in:
   - Platform: iOS
   - Name: Office Bridge
   - Primary Language: English (U.S.)
   - Bundle ID: com.faithfulandtrue.officebridge
   - SKU: officebridge001
4. Save

### 4.4 TestFlight Setup
1. In App Store Connect, click your app
2. Go to "TestFlight" tab
3. Click on your build (may take 15-30 min to process)
4. Fill in "What to Test" notes
5. Add test information for compliance questions
6. Click "Internal Testing" > "+" > Create group
7. Add testers by email
8. Testers will receive an email to download TestFlight app

## Step 5: Testing

Testers need to:
1. Download "TestFlight" app from App Store
2. Open the email invitation
3. Tap "View in TestFlight"
4. Install Office Bridge
5. Open and test!

## Common Issues

### "No signing certificate"
- Go to Xcode > Settings > Accounts
- Select your Apple ID
- Click "Manage Certificates"
- Click "+" and add iOS Distribution certificate

### "Provisioning profile doesn't include capability"
- In Xcode, go to Signing & Capabilities
- Remove and re-add any capabilities causing issues
- Let Xcode regenerate provisioning profiles

### Build fails with module errors
```bash
# Clean and rebuild
cd frontend
rm -rf ios
npm run build
npx cap add ios
npx cap sync
```

### Camera not working on device
- Make sure Info.plist has camera permissions
- Test on real device (simulator doesn't have camera)

## Updating the App

When you make changes:

```bash
# Rebuild web app
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Archive and upload again
# Increment build number in Xcode
```

## Environment Configuration

For the API URL, edit `src/utils/api.ts`:

```typescript
// Development
const API_BASE_URL = 'http://localhost:8001/api';

// Production (your server)
const API_BASE_URL = 'https://your-server.com/api';
```

## File Structure After Setup

```
frontend/
├── ios/                    # Native iOS project (generated)
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist
│   │   │   ├── Assets.xcassets/
│   │   │   └── ...
│   │   └── App.xcodeproj
│   └── ...
├── dist/                   # Built web app
├── src/                    # Source code
├── capacitor.config.ts     # Capacitor config
└── package.json
```

## Need Help?

- Capacitor Docs: https://capacitorjs.com/docs
- iOS Development: https://developer.apple.com/documentation
- TestFlight: https://developer.apple.com/testflight/
