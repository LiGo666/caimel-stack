"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/features/shadcn/components/ui/dialog"
import { Button } from "@/features/shadcn/components/ui/button"
import { Input } from "@/features/shadcn/components/ui/input"
import { Label } from "@/features/shadcn/components/ui/label"
import { useState } from "react"
import { getNumbers } from "../action"

interface ShowPasswordModalProps {
   onSuccess: () => void
}

export default function ShowPasswordModal({ onSuccess }: ShowPasswordModalProps) {
   const [password, setPassword] = useState("")
   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState("")

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      setError("")

      try {
         const result = await getNumbers(password)

         if (!result.authenticated) {
            setError("Invalid password")
         } else {
            onSuccess()
         }
      } catch (err) {
         setError("Authentication failed")
      } finally {
         setIsLoading(false)
      }
   }

   return (
      <div className="relative min-h-screen">
         {/* Blurred background overlay */}
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
         
         {/* Password Modal */}
         <div className="fixed inset-0 flex items-center justify-center z-50">
            <Dialog open={true} onOpenChange={() => {}}>
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
                           autoFocus
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                     </div>
                     <div className="flex justify-end space-x-2">
                        <Button type="submit" disabled={isLoading} className="w-full">
                           {isLoading ? "Authenticating..." : "Submit"}
                        </Button>
                     </div>
                  </form>
               </DialogContent>
            </Dialog>
         </div>
      </div>
   )
}
