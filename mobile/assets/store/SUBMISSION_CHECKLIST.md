# Shield AI - App Store Submission Checklist

## Pre-Submission Requirements

### Developer Accounts
- [ ] **Apple Developer Account** ($99/year)
  - Sign up at: https://developer.apple.com/programs/enroll/
  - Enable App Store Connect access
  - Create App ID with bundle identifier: `com.shieldai.app`

- [ ] **Google Play Console** ($25 one-time)
  - Sign up at: https://play.google.com/console/signup
  - Complete identity verification
  - Create app with package name: `com.shieldai.app`

### EAS Configuration
Update these files with your credentials:

**`app.json`** - Update the EAS project ID:
```json
{
  "extra": {
    "eas": {
      "projectId": "YOUR_ACTUAL_PROJECT_ID"
    }
  },
  "updates": {
    "url": "https://u.expo.dev/YOUR_ACTUAL_PROJECT_ID"
  }
}
```

**`eas.json`** - Update submit configuration:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      }
    }
  }
}
```

### App Icons (DONE)
- [x] iOS App Icon (1024x1024) - `assets/icon.png`
- [x] Android Adaptive Icon - `assets/adaptive-icon.png`
- [x] Notification Icon - `assets/notification-icon.png`

### Screenshots (PENDING)
Run Maestro to capture screenshots:
```bash
cd mobile
npx maestro test .maestro/screenshot-flow.yaml
```

Required screenshots:
- [ ] iPhone 6.7" (1290x2796) - iPhone 15 Pro Max
- [ ] iPhone 6.5" (1284x2778) - iPhone 14 Plus
- [ ] iPhone 5.5" (1242x2208) - iPhone 8 Plus
- [ ] iPad 12.9" (2048x2732) - iPad Pro
- [ ] Android Phone (1080x1920)
- [ ] Android 7" Tablet (1200x1920)
- [ ] Android 10" Tablet (1800x2560)

### Store Metadata (DONE)
- [x] App Name: Shield AI
- [x] Subtitle: AI-Powered DNS Protection
- [x] Short Description (80 chars)
- [x] Full Description (4000 chars)
- [x] Keywords for ASO
- [x] Support URL: https://shieldai.dev/support
- [x] Privacy Policy URL: https://shieldai.dev/privacy

---

## Build Commands

### Development Build (Testing)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create EAS project (first time only)
eas init

# Build for iOS Simulator
eas build --profile development --platform ios

# Build Android APK
eas build --profile development --platform android
```

### Preview Build (Internal Testing)
```bash
# iOS - TestFlight internal
eas build --profile preview --platform ios

# Android - Internal testing APK
eas build --profile preview --platform android
```

### Production Build
```bash
# iOS - App Store submission
eas build --profile production --platform ios

# Android - Play Store submission (AAB)
eas build --profile production --platform android
```

---

## Submission Steps

### iOS (App Store Connect)
1. Build production iOS app:
   ```bash
   eas build --profile production --platform ios
   ```

2. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

3. In App Store Connect:
   - Upload screenshots for each device size
   - Fill in app description, keywords
   - Set pricing (Free with IAP)
   - Add privacy policy URL
   - Submit for review

### Android (Google Play Console)
1. Build production Android app:
   ```bash
   eas build --profile production --platform android
   ```

2. Submit to Play Store:
   ```bash
   eas submit --platform android
   ```

3. In Play Console:
   - Upload screenshots
   - Complete store listing
   - Fill in data safety form
   - Set up internal testing track
   - Promote to production

---

## Testing Checklist

### Before Submission
- [ ] All screens render correctly
- [ ] Authentication flow works (login/register/logout)
- [ ] VPN toggle connects (with native module)
- [ ] Push notifications work
- [ ] API calls succeed with production backend
- [ ] Deep links work (`shieldai://`)
- [ ] No crashes on startup
- [ ] No memory leaks
- [ ] Battery usage is reasonable

### TestFlight Beta (iOS)
- [ ] Upload build to TestFlight
- [ ] Add internal testers
- [ ] Test on real devices (iPhone, iPad)
- [ ] Gather feedback
- [ ] Fix any issues

### Internal Testing (Android)
- [ ] Upload to internal testing track
- [ ] Test on multiple device sizes
- [ ] Test on Android 10, 11, 12, 13, 14
- [ ] Verify permissions work correctly
- [ ] Fix any issues

---

## Common Issues & Solutions

### Build Failures
- **Missing credentials**: Run `eas credentials` to configure
- **Provisioning profile**: Ensure bundle ID matches in Apple Developer
- **Keystore issues**: Let EAS manage credentials with `credentialsSource: "remote"`

### Submission Rejections
- **Privacy policy**: Must be accessible and comprehensive
- **Screenshots**: Must match current app version
- **Metadata**: No placeholder text or broken links
- **Permissions**: Justify each permission in app description

### Post-Launch
- [ ] Monitor crash reports
- [ ] Respond to reviews
- [ ] Track download metrics
- [ ] Plan v1.1 features based on feedback

---

## Timeline Estimate

| Phase | Tasks |
|-------|-------|
| **Setup** | Developer accounts, EAS config |
| **Screenshots** | Capture on simulators/devices |
| **Build** | Production builds for both platforms |
| **Beta** | TestFlight + Internal testing |
| **Review** | App Store + Play Store review |
| **Launch** | Marketing, launch |

---

## Resources

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Maestro Documentation](https://maestro.mobile.dev/)
