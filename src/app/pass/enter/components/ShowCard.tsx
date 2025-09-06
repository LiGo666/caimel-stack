"use client"

import { Card, CardContent } from "@/features/shadcn/components/ui/card"
import { useState, useEffect } from "react"
import { getNumbers } from "../action"

// Component for displaying large character
function LargeCharacterCard({ character }: { character: string | number }) {
   return (
      <Card className="w-full h-48 flex items-center justify-center hover:shadow-lg transition-shadow">
         <CardContent className="p-0">
            <div className="text-8xl font-bold text-center text-primary">{character}</div>
         </CardContent>
      </Card>
   )
}

export default function ShowCard() {
   const [numbers, setNumbers] = useState<number[]>([])

   useEffect(() => {
      const fetchNumbers = async () => {
         const result = await getNumbers()
         if (result.authenticated) {
            setNumbers(result.numbers)
         }
      }
      
      fetchNumbers()
   }, [])

   return (
      <div className="container mx-auto p-6">
         <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Large Character Cards</h1>
            <p className="text-muted-foreground">Dynamic cards with large numbers</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {numbers.map((number, index) => (
               <LargeCharacterCard key={index} character={number} />
            ))}
         </div>
      </div>
   )
}
