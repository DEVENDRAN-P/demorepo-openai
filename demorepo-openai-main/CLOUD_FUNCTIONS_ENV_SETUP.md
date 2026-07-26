# Environment Variables Template

## For Cloud Functions (functions/.env.local)

```
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Email Configuration
EMAIL_FROM=noreply@gstbuddy.ai
EMAIL_FROM_NAME=GSTBuddy

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com

# App Configuration
APP_NAME=GSTBuddy
APP_URL=https://gstbuddy.app
SUPPORT_EMAIL=support@gstbuddy.ai
```

## For Local Development

Create `functions/.env.local`:

```bash
cp functions/.env.example functions/.env.local
```

Then edit with your actual values:

```
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=noreply@gstbuddy.ai
```

## How to Get SendGrid API Key

1. Create SendGrid account: https://sendgrid.com
2. Login to dashboard
3. Go to Settings → API Keys
4. Click "Create API Key"
5. Give it a name: "GSTBuddy Cloud Functions"
6. Select "Mail Send" permission
7. Copy the key and paste into .env

## How to Get Firebase Credentials

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. You'll get a JSON file with:
   - `type`: "service_account"
   - `project_id`: Your project ID
   - `private_key`: Your private key
   - `client_email`: Service account email

## Required Permission Scopes

For Cloud Functions:

```json
{
  "scopes": [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase"
  ]
}
```

## Firebase CLI Setup

After setting config values:

```bash
# Test configuration
firebase functions:config:get

# Expected output
{
  "sendgrid": {
    "api_key": "SG.xxxxx"
  },
  "email": {
    "from": "noreply@gstbuddy.ai"
  }
}

# Deploy with updated config
firebase deploy --only functions
```

## Emulator Setup (Local Development)

For testing locally without deploying:

```bash
# Start emulator
firebase emulators:start --only functions

# In another terminal, test locally
curl http://localhost:5001/your-project/us-central1/triggerBillReminders
```

Create `functions/.local.env`:

```
SENDGRID_API_KEY=SG.test_key_for_local_testing
EMAIL_FROM=test@localhost
```

## Security Best Practices

1. **Never commit .env files**:

   ```bash
   # Add to .gitignore
   echo "functions/.env*" >> .gitignore
   echo ".env*" >> .gitignore
   ```

2. **Use Firebase Config instead of .env**:

   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_KEY"
   ```

3. **Rotate API keys regularly**:
   - Generate new SendGrid key monthly
   - Revoke old keys after rotation

4. **Restrict API key permissions**:
   - Only "Mail Send" scope
   - IP whitelist if possible
   - Time-limited keys for testing

5. **Use Google Cloud Secrets (recommended)**:

   ```bash
   # Create secret
   gcloud secrets create sendgrid-api-key --data-file=- <<< "SG.xxxxx"

   # Access in Cloud Function
   const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
   const client = new SecretManagerServiceClient();
   const [version] = await client.accessSecretVersion({
     name: 'projects/MY_PROJECT_ID/secrets/sendgrid-api-key/versions/latest',
   });
   const secretString = version.payload.data.toString('utf8');
   ```

## Testing Configuration

Test your setup before deployment:

```bash
# 1. Verify SendGrid key works
firebase functions:config:get
# Should show: sendgrid.api_key: "SG.xxxxx"

# 2. Deploy test version
firebase deploy --only functions

# 3. Test sending email
curl -X POST \
  https://us-central1-YOUR_PROJECT.cloudfunctions.net/triggerBillReminders \
  -H "Content-Type: application/json"

# 4. Check logs
firebase functions:log --follow
```

## Multiple Environments

### Development

```bash
firebase use dev
firebase functions:config:set sendgrid.api_key="SG.dev_key"
firebase deploy --only functions
```

### Production

```bash
firebase use prod
firebase functions:config:set sendgrid.api_key="SG.prod_key"
firebase deploy --only functions
```

### Switch between

```bash
firebase use dev    # Use dev project
firebase use prod   # Use prod project
firebase projects:list  # See all projects
```

## Troubleshooting

### "Cannot find module 'nodemailer'"

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### "SendGrid API key not set"

```bash
# Check config
firebase functions:config:get

# If empty, set it
firebase functions:config:set sendgrid.api_key="SG.xxxxx"

# Deploy again
firebase deploy --only functions
```

### "Permission denied: Cloud Functions"

Check IAM roles in Firebase Console:

- Service Account needs: "Cloud Functions Admin"
- And: "Cloud Pub/Sub Editor" (for scheduled jobs)

## Summary

| Environment | Function                           | Setup            |
| ----------- | ---------------------------------- | ---------------- |
| Local Dev   | `firebase emulators:start`         | .env.local       |
| Cloud       | `firebase deploy --only functions` | Firebase Config  |
| Testing     | Manual curl/HTTP                   | Trigger endpoint |
| Production  | Scheduled (daily)                  | SendGrid API key |

**Key files**:

- `functions/.env.local` - Local environment variables
- `firebase.json` - Firebase configuration
- `.firebaserc` - Firebase projects (don't commit)
