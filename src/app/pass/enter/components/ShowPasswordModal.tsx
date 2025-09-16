"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/features/shadcn/index.client";
import { getNumbers } from "../action";

interface ShowPasswordModalProps {
  onSuccess: () => void;
}

export default function ShowPasswordModal({
  onSuccess,
}: ShowPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await getNumbers(password);

      if (result.authenticated) {
        onSuccess();
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Blurred background overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

      {/* Password Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog onOpenChange={() => {}} open={true}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Password</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  autoFocus
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
                <Button className="w-full" disabled={isLoading} type="submit">
                  {isLoading ? "Authenticating..." : "Submit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
