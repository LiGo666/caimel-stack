"use client";

import { useState } from "react";
import { callServerAction } from "./actions";

export default function Test2Page() {
  const [result, setResult] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      // Call server action directly
      const data = await callServerAction();
      setResult(data);
    } catch (error) {
      // Check if this is a rate limit error
      if (error instanceof Error && error.message.includes("429")) {
        setResult("Rate limit exceeded. Please try again later.");
      } else {
        setResult("Error calling server action");
      }
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-4 font-bold text-2xl">Test2 Page</h1>
      <p className="mb-4">
        This page demonstrates a server action with rate limiting.
      </p>

      <button onClick={handleClick} type="button">
        Call Server Action
      </button>

      {result && (
        <div>
          <p>Server response: {result}</p>
        </div>
      )}
    </div>
  );
}
