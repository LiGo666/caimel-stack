"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/features/shadcn/index.client";
import { getNumbers } from "./action";

// Component for displaying large character
function LargeCharacterCard({ character }: { character: string | number }) {
  return (
    <Card className="flex h-48 w-full items-center justify-center transition-shadow hover:shadow-lg">
      <CardContent className="p-0">
        <div className="text-center font-bold text-8xl text-primary">
          {character}
        </div>
      </CardContent>
    </Card>
  );
}

// Password Modal Component
function PasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { password, redirect: false });

      if (result?.error) {
        setError("Invalid password");
      } else {
        onClose();
      }
    } catch (err) {
      setError("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Password</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 py-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              className="w-full"
              disabled={isLoading}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              type="password"
              value={password}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              disabled={isLoading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Authenticating..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PassEnterPage() {
  const { data: session, status } = useSession();
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [serverAuthenticated, setServerAuthenticated] = useState(false);

  // Fetch numbers from server action
  useEffect(() => {
    const fetchNumbers = async () => {
      const result = await getNumbers();
      setNumbers(result.numbers);
      setServerAuthenticated(result.authenticated);

      // Show password modal if server says not authenticated
      if (!result.authenticated) {
        setShowPasswordModal(true);
      }
    };

    fetchNumbers();
  }, []);

  // Also check client-side session state
  useEffect(() => {
    if (status === "authenticated") {
      // Re-fetch numbers when client session is authenticated
      const refetchNumbers = async () => {
        const result = await getNumbers();
        setNumbers(result.numbers);
        setServerAuthenticated(result.authenticated);
        setShowPasswordModal(!result.authenticated);
      };
      refetchNumbers();
    }
  }, [status]);

  const isAuthenticated = status === "authenticated" && serverAuthenticated;

  return (
    <div className="relative min-h-screen">
      {/* Main content with conditional blur */}
      <div
        className={`container mx-auto p-6 transition-all duration-300 ${isAuthenticated ? "" : "pointer-events-none blur-md"}`}
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-4xl">Large Character Cards</h1>
          <p className="text-muted-foreground">
            Dynamic cards with large numbers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {numbers.map((number, index) => (
            <LargeCharacterCard character={number} key={index} />
          ))}
        </div>
      </div>

      {/* Password Modal Overlay */}
      {!isAuthenticated && (
        <>
          {/* Dark overlay */}
          <div className="fixed inset-0 z-40 bg-black/50" />

          {/* Password Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <PasswordModal
              isOpen={showPasswordModal}
              onClose={() => {}} // Prevent closing until authenticated
            />
          </div>
        </>
      )}
    </div>
  );
}
