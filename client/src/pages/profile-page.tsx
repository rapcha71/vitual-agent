import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">User Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Username:</span>
              <span>{user?.username}</span>
              <span className="text-muted-foreground">Full Name:</span>
              <span>{user?.fullName || 'Not set'}</span>
              <span className="text-muted-foreground">Mobile:</span>
              <span>{user?.mobile || 'Not set'}</span>
              <span className="text-muted-foreground">Nickname:</span>
              <span>{user?.nickname || 'Not set'}</span>
              <span className="text-muted-foreground">Last Login:</span>
              <span>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}