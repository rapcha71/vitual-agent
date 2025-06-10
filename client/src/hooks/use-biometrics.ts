import { useState } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { registerBiometric, authenticateWithBiometric, checkBiometricStatus } from '@/lib/webauthn';

export function useBiometrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const setupBiometrics = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in first to set up biometric authentication.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      await registerBiometric();
      toast({
        title: "Success",
        description: "Biometric authentication has been set up successfully.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Failed to set up biometric authentication",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsRegistering(false);
    }
  };

  const authenticateWithBiometrics = async (username: string) => {
    setIsAuthenticating(true);
    try {
      const isAvailable = await checkBiometricStatus(username);
      if (!isAvailable) {
        throw new Error("Biometric authentication not set up for this account");
      }

      await authenticateWithBiometric(username);
      toast({
        title: "Success",
        description: "Biometric authentication successful",
      });
      return true;
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Failed to authenticate with biometrics",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    setupBiometrics,
    authenticateWithBiometrics,
    isRegistering,
    isAuthenticating,
  };
}
