"use client"

import { Card, CardContent } from "@/features/shadcn/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/features/shadcn/components/ui/dialog"
import { Button } from "@/features/shadcn/components/ui/button"
import { Input } from "@/features/shadcn/components/ui/input"
import { Label } from "@/features/shadcn/components/ui/label"
import { useSession, signIn } from "next-auth/react"
import { useState, useEffect } from "react"
import { getNumbers } from "./action"

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

// Password Modal Component
function PasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
   const [password, setPassword] = useState("")
   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState("")

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      setError("")

      try {
         const result = await signIn("credentials", { password, redirect: false })

         if (result?.error) {
            setError("Invalid password")
         } else {
            onClose()
         }
      } catch (err) {
         setError("Authentication failed")
      } finally {
         setIsLoading(false)
      }
   }

   return (
      <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Enter Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                     id="password"
                     type="password"
                     placeholder="Enter your password"
                     className="w-full"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={isLoading}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
               </div>
               <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                     Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                     {isLoading ? "Authenticating..." : "Submit"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   )
}

export default function PassEnterPage() {
   const { data: session, status } = useSession()
   const [showPasswordModal, setShowPasswordModal] = useState(true)
   const [numbers, setNumbers] = useState<number[]>([])
   const [serverAuthenticated, setServerAuthenticated] = useState(false)

   // Fetch numbers from server action
   useEffect(() => {
      const fetchNumbers = async () => {
         const result = await getNumbers()
         setNumbers(result.numbers)
         setServerAuthenticated(result.authenticated)

         // Show password modal if server says not authenticated
         if (!result.authenticated) {
            setShowPasswordModal(true)
         }
      }

      fetchNumbers()
   }, [])

   // Also check client-side session state
   useEffect(() => {
      if (status === "authenticated") {
         // Re-fetch numbers when client session is authenticated
         const refetchNumbers = async () => {
            const result = await getNumbers()
            setNumbers(result.numbers)
            setServerAuthenticated(result.authenticated)
            setShowPasswordModal(!result.authenticated)
         }
         refetchNumbers()
      }
   }, [status])

   const isAuthenticated = status === "authenticated" && serverAuthenticated

   return (
      <div className="relative min-h-screen">
         {/* Main content with conditional blur */}
         <div className={`container mx-auto p-6 transition-all duration-300 ${!isAuthenticated ? "blur-md pointer-events-none" : ""}`}>
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

         {/* Password Modal Overlay */}
         {!isAuthenticated && (
            <>
               {/* Dark overlay */}
               <div className="fixed inset-0 bg-black/50 z-40" />

               {/* Password Modal */}
               <div className="fixed inset-0 flex items-center justify-center z-50">
                  <PasswordModal
                     isOpen={showPasswordModal}
                     onClose={() => {}} // Prevent closing until authenticated
                  />
               </div>
            </>
         )}
      </div>
   )
}
