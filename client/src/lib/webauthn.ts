import { 
  startRegistration,
  startAuthentication 
} from '@simplewebauthn/browser';

export async function registerBiometric() {
  try {
    const optionsResponse = await fetch('/api/webauthn/register', {
      method: 'POST',
      credentials: 'include',
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to get registration options');
    }

    const options = await optionsResponse.json();
    const registration = await startRegistration(options);

    const verificationResponse = await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registration),
    });

    if (!verificationResponse.ok) {
      throw new Error('Failed to verify registration');
    }

    return true;
  } catch (error) {
    console.error('Biometric registration error:', error);
    throw error;
  }
}

export async function authenticateWithBiometric(username: string) {
  try {
    const optionsResponse = await fetch('/api/webauthn/authenticate-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to get authentication options');
    }

    const options = await optionsResponse.json();
    const authentication = await startAuthentication(options);

    const verificationResponse = await fetch('/api/webauthn/authenticate-verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authentication),
    });

    if (!verificationResponse.ok) {
      throw new Error('Failed to verify authentication');
    }

    return true;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    throw error;
  }
}

export async function checkBiometricStatus(username: string) {
  try {
    const response = await fetch('/api/webauthn/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error('Failed to check biometric status');
    }

    const { enabled } = await response.json();
    return enabled;
  } catch (error) {
    console.error('Error checking biometric status:', error);
    throw error;
  }
}