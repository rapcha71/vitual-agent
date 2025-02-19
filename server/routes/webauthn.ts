import { Router } from 'express';
import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { storage } from '../storage';
import { rpID, rpName, origin } from '../config';

const router = Router();

router.post('/webauthn/register-options', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: req.user.id.toString(),
      userName: req.user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform'
      }
    });

    req.session.currentChallenge = options.challenge;
    await req.session.save();

    res.json(options);
  } catch (error) {
    console.error('Error generating registration options:', error);
    res.status(500).json({ message: 'Failed to generate registration options' });
  }
});

router.post('/webauthn/register-verify', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const expectedChallenge = req.session.currentChallenge;
    if (!expectedChallenge) {
      throw new Error('No challenge found in session');
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      await storage.updateUserBiometricCredentials(req.user.id, {
        credentialID: Buffer.from(credentialID),
        publicKey: Buffer.from(credentialPublicKey),
        counter,
      });

      delete req.session.currentChallenge;
      await req.session.save();

      res.json({ verified: true });
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    console.error('Error verifying registration:', error);
    res.status(400).json({ message: 'Failed to verify registration' });
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
        id: Buffer.from(user.biometricCredentialId, 'base64'),
        type: 'public-key',
      }],
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
  const credential = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Authentication session expired' });
  }

  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.biometricCredentialId || !user.biometricPublicKey) {
      return res.status(400).json({ message: 'No biometric credentials found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(user.biometricCredentialId, 'base64'),
        credentialPublicKey: Buffer.from(user.biometricPublicKey, 'base64'),
        counter: user.biometricCounter || 0,
      },
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