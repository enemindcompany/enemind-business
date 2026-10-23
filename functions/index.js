// Add the authenticated role expected by Supabase Third-Party Auth.
// New users receive a persistent custom claim at account creation. Existing users
// receive a session claim on sign-in, so they do not need to recreate their account.
// Requires Firebase Authentication upgraded to Identity Platform for blocking functions.
const { beforeUserCreated, beforeUserSignedIn } = require('firebase-functions/v2/identity');

exports.addAuthenticatedRoleOnCreate = beforeUserCreated(() => ({
  customClaims: { role: 'authenticated' },
}));

exports.addAuthenticatedRoleOnSignIn = beforeUserSignedIn(() => ({
  sessionClaims: { role: 'authenticated' },
}));
