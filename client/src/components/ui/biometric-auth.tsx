import { Button } from "./button";
import { Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

interface BiometricAuthProps {
  mode: "register" | "authenticate";
  username?: string;
}

export function BiometricAuth({ mode, username }: BiometricAuthProps) {
  const { toast } = useToast();
  const { loginMutation, user } = useAuth();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if biometric auth is supported and enabled
    const checkBiometricStatus = async () => {
      const supported = await checkBiometricSupport();
      setBiometricSupported(supported);

      if (!supported) {
        toast({
          title: "Not Supported",
          description: "Biometric authentication is not supported on this device.",
          variant: "destructive",
        });
        return;
      }

      if (mode === "authenticate" && username) {
        try {
          const response = await fetch('/api/webauthn/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          });

          if (!response.ok) {
            throw new Error('Failed to check biometric status');
          }

          const { enabled } = await response.json();
          setIsEnabled(enabled);
        } catch (error) {
          console.error("Error checking biometric status:", error);
          toast({
            title: "Error",
            description: "Failed to check biometric status",
            variant: "destructive",
          });
        }
      }
    };

    checkBiometricStatus();
  }, [mode, username, toast]);

  const checkBiometricSupport = async () => {
    if (!window.PublicKeyCredential) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error("Error checking biometric support:", error);
      return false;
    }
  };

  const handleRegistration = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in first to set up biometric authentication.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const optionsResponse = await fetch('/api/webauthn/register-options', {
        method: 'POST',
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.message || 'Failed to get registration options');
      }

      const options = await optionsResponse.json();
      const attestation = await startRegistration(options);

      const verificationResponse = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attestation),
      });

      if (!verificationResponse.ok) {
        const error = await verificationResponse.json();
        throw new Error(error.message || 'Failed to verify registration');
      }

      setIsEnabled(true);
      toast({
        title: "Success!",
        description: "Biometric authentication has been set up successfully.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometric credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async () => {
    if (!username) {
      toast({
        title: "Username Required",
        description: "Please enter your username before using biometric login.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const optionsResponse = await fetch('/api/webauthn/authenticate-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.message || 'Failed to get authentication options');
      }

      const options = await optionsResponse.json();
      const assertion = await startAuthentication(options);

      const verificationResponse = await fetch('/api/webauthn/authenticate-verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assertion),
      });

      if (!verificationResponse.ok) {
        const error = await verificationResponse.json();
        throw new Error(error.message || 'Failed to verify authentication');
      }

      const result = await verificationResponse.json();
      if (result.verified) {
        loginMutation.mutate({ username, password: '' });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with biometrics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!biometricSupported && mode === "register") {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={true}
      >
        <Fingerprint className="h-4 w-4 mr-2" />
        Biometric Login Not Supported
      </Button>
    );
  }

  if (!biometricSupported && mode === "authenticate") {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={mode === "register" ? handleRegistration : handleAuthentication}
      disabled={mode === "authenticate" && !username || isLoading}
    >
      <Fingerprint className="h-4 w-4 mr-2" />
      {isLoading ? "Processing..." : (
        mode === "register" 
          ? (isEnabled ? "Biometric Login Enabled" : "Set Up Biometric Login")
          : (isEnabled 
              ? "Use Biometric Login" 
              : username 
                ? "Biometric Login Not Set Up"
                : "Enter Username First")
      )}
    </Button>
  );
}