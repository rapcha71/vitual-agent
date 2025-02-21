import { Router } from 'express';
import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/server';
import { storage } from '../storage';
import { rpID, rpName, origin } from '../config';
import { VerifiedRegistrationResponse } from '@simplewebauthn/server';

const router = Router();

router.post('/webauthn/register', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    console.log("Generating registration options for user:", req.user.username);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: req.user.id,
      userName: req.user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform'
      }
    });

    req.session.challenge = options.challenge;
    await req.session.save();

    console.log("Registration options generated successfully");
    res.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    res.status(500).json({ message: "Failed to generate registration options" });
  }
});

router.post('/webauthn/register/verify', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    console.log("Verifying registration response");
    const expectedChallenge = req.session.challenge;
    if (!expectedChallenge) {
      throw new Error("No challenge found in session");
    }

    const verification = await verifyRegistrationResponse({
      response: req.body as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification as VerifiedRegistrationResponse;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = registrationInfo;

      await storage.updateUserBiometricCredentials(req.user.id, {
        credentialID: credentialID,
        publicKey: credentialPublicKey,
        counter,
      });

      delete req.session.challenge;
      await req.session.save();

      console.log("Registration verified successfully");
      res.json({ verified: true });
    } else {
      throw new Error("Verification failed");
    }
  } catch (error) {
    console.error("Error verifying registration:", error);
    res.status(400).json({ message: "Failed to verify registration" });
  }
});

router.post('/webauthn/authenticate-options', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.biometricCredentialId) {
      return res.status(400).json({ message: 'No biometric credentials found' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: user.biometricCredentialId,
        type: 'public-key',
        transports: ['internal'],
      }],
      userVerification: 'preferred',
    });

    req.session.currentChallenge = options.challenge;
    req.session.authenticationUsername = username;
    await req.session.save();

    res.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    res.status(500).json({ message: 'Failed to generate authentication options' });
  }
});

router.post('/webauthn/authenticate-verify', async (req, res) => {
  const challenge = req.session.currentChallenge;
  const username = req.session.authenticationUsername;

  if (!username || !challenge) {
    return res.status(400).json({ message: 'Authentication session expired' });
  }

  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.biometricCredentialId || !user.biometricPublicKey) {
      return res.status(400).json({ message: 'No biometric credentials found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body as AuthenticationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: user.biometricCredentialId,
        credentialPublicKey: user.biometricPublicKey,
        counter: user.biometricCounter || 0,
      },
      requireUserVerification: true,
    });

    if (verification.verified) {
      await storage.updateUserBiometricCounter(user.id, verification.authenticationInfo.newCounter);

      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ message: 'Error creating session' });
        }
        res.json({ verified: true });
      });
    } else {
      res.status(400).json({ message: 'Verification failed' });
    }
  } catch (error) {
    console.error('Error verifying authentication:', error);
    res.status(500).json({ message: 'Failed to verify authentication' });
  }
});

router.post('/webauthn/status', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    res.json({ enabled: user.biometricEnabled });
  } catch (error) {
    console.error('Error checking WebAuthn status:', error);
    res.status(500).json({ message: 'Failed to check WebAuthn status' });
  }
});

export default router;