"use client";

import { useEffect, useState } from "react";
import { getNumbers } from "./action";
import ShowCard from "./components/ShowCard";
import ShowPasswordModal from "./components/ShowPasswordModal";

export default function PassEnterPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      const result = await getNumbers();
      setIsAuthenticated(result.authenticated);
      setIsLoading(false);
    };

    checkAuthentication();
  }, []);

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <ShowCard />
      ) : (
        <ShowPasswordModal onSuccess={handlePasswordSuccess} />
      )}
    </>
  );
}
