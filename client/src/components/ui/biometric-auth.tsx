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

  useEffect(() => {
    // Check if biometric auth is supported and enabled
    const checkBiometricStatus = async () => {
      const supported = await checkBiometricSupport();
      setBiometricSupported(supported);

      if (mode === "authenticate" && username) {
        try {
          const response = await fetch('/api/webauthn/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          });
          const { enabled } = await response.json();
          setIsEnabled(enabled);

          // If biometrics are enabled and supported, automatically trigger auth
          if (enabled && supported) {
            handleAuthentication();
          }
        } catch (error) {
          console.error("Error checking biometric status:", error);
        }
      }
    };

    checkBiometricStatus();
  }, [mode, username]);

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
      const resp = await fetch('/api/webauthn/register', {
        method: 'POST',
        credentials: 'include'
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message || 'Failed to get registration options');
      }

      const options = await resp.json();
      const attestation = await startRegistration(options);

      const verificationResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attestation),
      });

      if (!verificationResp.ok) {
        const error = await verificationResp.json();
        throw new Error(error.message || 'Failed to verify registration');
      }

      setIsEnabled(true);
      toast({
        title: "Success!",
        description: "Biometric authentication has been set up. You can now use it for future logins.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometric credentials.",
        variant: "destructive",
      });
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
      const resp = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message || 'Failed to get authentication options');
      }

      const options = await resp.json();
      const assertion = await startAuthentication(options);

      const verificationResp = await fetch('/api/webauthn/authenticate/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assertion),
      });

      if (!verificationResp.ok) {
        const error = await verificationResp.json();
        throw new Error(error.message || 'Failed to verify authentication');
      }

      const result = await verificationResp.json();
      if (result.success) {
        loginMutation.mutate({ username, password: '' });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with biometrics.",
        variant: "destructive",
      });
    }
  };

  if (!biometricSupported) {
    return null;
  }

  // Don't show register button on login page
  if (mode === "register" && !user) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={mode === "register" ? handleRegistration : handleAuthentication}
      disabled={mode === "authenticate" && !username}
    >
      <Fingerprint className="h-4 w-4 mr-2" />
      {mode === "register" 
        ? "Set Up Biometric Login" 
        : isEnabled
          ? "Use Biometric Login"
          : username 
            ? "Biometric Login Not Set Up"
            : "Enter Username First"}
    </Button>
  );
}