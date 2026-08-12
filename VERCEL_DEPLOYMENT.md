# Vercel Deployment Notes

## Verification

Run:

```bash
npm run verify
```

This runs the project guard, TypeScript check, lint, and production build.

## Production rule

Do not promote a deployment to production until the Vercel Preview build and runtime smoke tests pass.
