"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/features/shadcn/index.client";
import { getNumbers } from "../action";

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

export default function ShowCard() {
  const [numbers, setNumbers] = useState<number[]>([]);

  useEffect(() => {
    const fetchNumbers = async () => {
      const result = await getNumbers();
      if (result.authenticated) {
        setNumbers(result.numbers);
      }
    };

    fetchNumbers();
  }, []);

  return (
    <div className="container mx-auto p-6">
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
  );
}
