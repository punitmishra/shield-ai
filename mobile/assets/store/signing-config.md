# App Signing Configuration Guide

## iOS App Store

### Requirements
1. Apple Developer Program membership ($99/year)
2. Xcode 15+ installed
3. Valid Apple ID with developer access

### Setup Steps

#### 1. Create App ID
```bash
# In Apple Developer Portal:
# Identifiers > App IDs > Register
# Bundle ID: com.shieldai.app
# Capabilities: Push Notifications, Network Extensions
```

#### 2. Create Provisioning Profiles
```bash
# Development Profile
# - Type: iOS App Development
# - App ID: com.shieldai.app
# - Devices: Add test devices

# Distribution Profile
# - Type: App Store
# - App ID: com.shieldai.app
```

#### 3. Configure EAS Build
```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "credentialsSource": "remote"
      },
      "android": {
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json"
      }
    }
  }
}
```

#### 4. Build for TestFlight
```bash
# Login to Expo
eas login

# Configure credentials (first time)
eas credentials

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --latest
```

---

## Android Play Store

### Requirements
1. Google Play Console account ($25 one-time)
2. Java JDK 11+ installed
3. Android Studio for keystore generation

### Setup Steps

#### 1. Generate Upload Keystore
```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore shieldai-upload.keystore \
  -alias shieldai \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# Store password securely!
# Keystore password: [SECURE_PASSWORD]
# Key alias: shieldai
# Key password: [SECURE_PASSWORD]
```

#### 2. Configure Gradle (if using bare workflow)
```groovy
// android/app/build.gradle
android {
    signingConfigs {
        release {
            storeFile file('shieldai-upload.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'shieldai'
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### 3. Create Service Account for API Access
```bash
# In Google Cloud Console:
# 1. Create new service account
# 2. Grant "Service Account User" role
# 3. Download JSON key file
# 4. In Play Console, grant API access to service account
```

#### 4. Build for Play Store
```bash
# Build Android AAB
eas build --platform android --profile production

# Submit to Play Console
eas submit --platform android --latest
```

---

## Security Best Practices

### Credential Storage
- **NEVER** commit keystores or API keys to git
- Use environment variables for sensitive data
- Store credentials in EAS Secrets for CI/CD
- Keep backup of keystores in secure location (lost = can't update app)

### EAS Secrets
```bash
# Set secrets for EAS Build
eas secret:create --name KEYSTORE_PASSWORD --value "your-password"
eas secret:create --name KEY_PASSWORD --value "your-key-password"

# For iOS
eas secret:create --name APPLE_ID --value "your@apple.id"
eas secret:create --name APPLE_TEAM_ID --value "YOUR_TEAM_ID"
```

### Environment Variables
```bash
# .env.production (DO NOT COMMIT)
KEYSTORE_PASSWORD=your-secure-password
KEY_PASSWORD=your-key-password
APPLE_ID=your@apple.id
```

---

## Build Commands Reference

```bash
# Development build (for testing)
eas build --platform all --profile development

# Preview build (internal testing)
eas build --platform all --profile preview

# Production build (store submission)
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest

# Update OTA (for minor updates)
eas update --branch production --message "Bug fixes"
```

---

## Checklist Before Submission

### iOS
- [ ] App icon (1024x1024)
- [ ] Screenshots for all required sizes
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App Review notes
- [ ] Export compliance info
- [ ] IDFA usage declaration

### Android
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for phone and tablet
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target API level compliance
- [ ] Data safety form
