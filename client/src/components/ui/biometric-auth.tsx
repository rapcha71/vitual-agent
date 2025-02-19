import { Button } from "./button";
import { Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "@/hooks/use-auth";

interface BiometricAuthProps {
  mode: "register" | "authenticate";
  username?: string;
}

export function BiometricAuth({ mode, username }: BiometricAuthProps) {
  const { toast } = useToast();
  const { loginMutation, user } = useAuth();

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
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in first with your username and password to set up biometric authentication.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get registration options from server
      const resp = await fetch('/api/webauthn/register', {
        method: 'POST',
        credentials: 'include'
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message || 'Failed to get registration options');
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
        const error = await verificationResp.json();
        throw new Error(error.message || 'Failed to verify registration');
      }

      toast({
        title: "Success!",
        description: "Biometric authentication has been set up successfully! You can now use it for future logins.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometric credentials. Please try again.",
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
      // Get authentication options from server
      const resp = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        if (error.message.includes("No biometric credentials")) {
          toast({
            title: "Setup Required",
            description: "You need to set up biometric login first. Please log in with your password and click 'Set Up Biometric Login'.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(error.message || 'Failed to get authentication options');
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
        const error = await verificationResp.json();
        throw new Error(error.message || 'Failed to verify authentication');
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
        description: error.message || "Failed to authenticate with biometrics. Please try again or use password login.",
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
        title: "Error",
        description: error.message || "Failed to perform biometric authentication",
        variant: "destructive",
      });
    }
  };

  // Don't show register button on login page
  if (mode === "register" && !user) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={mode === "authenticate" && !username}
    >
      <Fingerprint className="h-4 w-4 mr-2" />
      {mode === "register" 
        ? "Set Up Biometric Login" 
        : username 
          ? "Use Biometric Login" 
          : "Enter Username First"}
    </Button>
  );
}