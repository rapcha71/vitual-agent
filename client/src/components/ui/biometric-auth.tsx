import { Button } from "./button";
import { Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "@/hooks/use-auth";

interface BiometricAuthProps {
  onRegister?: () => Promise<void>;
  onAuthenticate?: () => Promise<void>;
  mode: "register" | "authenticate";
  username?: string;
}

export function BiometricAuth({ mode, username }: BiometricAuthProps) {
  const { toast } = useToast();
  const { loginMutation } = useAuth();

  const checkBiometricSupport = async () => {
    if (!window.PublicKeyCredential) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support biometric authentication.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast({
          title: "Not Available",
          description: "Biometric authentication is not available on your device.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking biometric support:", error);
      return false;
    }
  };

  const handleRegistration = async () => {
    try {
      // Get registration options from server
      const resp = await fetch('/api/webauthn/register', {
        method: 'POST',
        credentials: 'include'
      });

      if (!resp.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await resp.json();

      // Create credentials
      const attestation = await startRegistration(options);

      // Send attestation to server for verification
      const verificationResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attestation),
      });

      if (!verificationResp.ok) {
        throw new Error('Failed to verify registration');
      }

      toast({
        title: "Success",
        description: "Biometric authentication has been set up successfully!",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometric credentials",
        variant: "destructive",
      });
    }
  };

  const handleAuthentication = async () => {
    if (!username) {
      toast({
        title: "Username Required",
        description: "Please enter your username before using biometric login",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get authentication options from server
      const resp = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!resp.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await resp.json();

      // Perform authentication
      const assertion = await startAuthentication(options);

      // Verify authentication with server
      const verificationResp = await fetch('/api/webauthn/authenticate/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assertion),
      });

      if (!verificationResp.ok) {
        throw new Error('Failed to verify authentication');
      }

      const result = await verificationResp.json();
      if (result.success) {
        // Trigger login success flow
        loginMutation.mutate({ username, password: '' });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with biometrics",
        variant: "destructive",
      });
    }
  };

  const handleClick = async () => {
    const supported = await checkBiometricSupport();
    if (!supported) return;

    try {
      if (mode === "register") {
        await handleRegistration();
      } else {
        await handleAuthentication();
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to perform biometric authentication",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={mode === "authenticate" && !username}
    >
      <Fingerprint className="h-4 w-4 mr-2" />
      {mode === "register" ? "Set Up Biometric Login" : "Use Biometric Login"}
    </Button>
  );
}