# Deploying Aether to AWS (App Runner + RDS)

The app is containerized (see `Dockerfile`) — one image serves both the API and the built
frontend on a single port. This guide deploys that image to **AWS App Runner** with a
**RDS Postgres** database behind it.

You'll need your own AWS account and either the AWS CLI configured locally, or you can run
the equivalent commands from AWS CloudShell in the console (no local install needed).

## 1. Create the AWS account

Sign up at [aws.amazon.com](https://aws.amazon.com) if you haven't already (requires a card
on file). Pick a region to deploy into (e.g. `us-east-1`) and use it consistently below.

## 2. Create an ECR repository and push the image

```
aws ecr create-repository --repository-name aether-app --region <region>

aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker build -t aether-app:latest .
docker tag aether-app:latest <account-id>.dkr.ecr.<region>.amazonaws.com/aether-app:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/aether-app:latest
```

## 3. Create the RDS Postgres database

- RDS Console → Create database → PostgreSQL → pick a free-tier-eligible instance class for
  testing (e.g. `db.t3.micro`), set a master username/password, database name `aether`.
- Note the resulting **endpoint** (e.g. `aether-db.xxxxx.<region>.rds.amazonaws.com`).
- Apply the schema once it's up:
  ```
  psql "postgres://<user>:<password>@<endpoint>:5432/aether" -f db/init/001_schema.sql
  ```
- Security group: RDS needs to accept inbound Postgres (port 5432) traffic from App Runner.
  The simplest path is an **App Runner VPC Connector** attached to the same VPC as the RDS
  instance, with the RDS security group allowing inbound 5432 from the VPC Connector's
  security group. (Making RDS fully public is simpler to wire up but not recommended.)

## 4. Create the App Runner service

- App Runner Console → Create service → **Container registry** → select the ECR image you
  pushed → deployment trigger: manual or automatic on new image push.
- If RDS is in a VPC (recommended), add a **VPC Connector** to the service pointing at that
  VPC/subnets so it can reach the database.
- Set these environment variables on the service (same names as `server/.env.example`):
  ```
  PORT=4000
  NODE_ENV=production
  DATABASE_URL=postgres://<user>:<password>@<rds-endpoint>:5432/aether
  GEMINI_API_KEY=<your key>
  GOOGLE_CLIENT_ID=<your client id>
  GOOGLE_CLIENT_SECRET=<your client secret>
  GOOGLE_REDIRECT_URI=<filled in after step 5>
  JWT_SECRET=<a long random string>
  FRONTEND_URL=<filled in after step 5>
  RESEND_API_KEY=<your key, optional>
  ```
- Deploy. App Runner assigns a default HTTPS URL like
  `https://xxxxxxxxxx.<region>.awsapprunner.com` — no domain purchase or TLS cert setup
  needed, it's provided automatically.

## 5. Wire up the real URL

Once you have the App Runner URL:

- Update `GOOGLE_REDIRECT_URI` to `https://<your-apprunner-url>/api/auth/google/callback`
  and `FRONTEND_URL` to `https://<your-apprunner-url>`, then redeploy the service so the new
  env vars take effect.
- In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add that
  same `https://<your-apprunner-url>/api/auth/google/callback` to the OAuth client's
  **Authorized redirect URIs**.

## 6. Fixing the Resend email restriction (needs a real domain)

This step is independent of AWS. Resend's default `onboarding@resend.dev` sender can only
deliver to the email address that owns the Resend account — not to whoever's logged into the
app. To send to any recipient:

1. Buy a domain (Namecheap, Cloudflare, etc.) — this is separate from your App Runner URL,
   you don't need to point your app's traffic at it.
2. Add it in [resend.com/domains](https://resend.com/domains) and add the TXT/DKIM records
   it gives you at your domain's DNS provider.
3. Once verified, update the `from` address in `server/src/lib/gemini.ts`
   (`"Aether <onboarding@resend.dev>"`) to `"Aether <noreply@yourdomain.com>"`, commit, and
   redeploy.

## Updating a running deployment

Rebuild, push a new image tag to ECR, and either let App Runner's automatic deployment pick
it up or trigger a manual deployment from the console.
