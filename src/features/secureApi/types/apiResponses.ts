import { ToastProps } from "@/features/toast"

export type ApiResponse<T extends Record<string, any> = {}> = {
   success: boolean
   data?: T
   timestamp?: string
   errorCode?: string
   httpStatus?: number
   headers?: Record<string, string>
} & Partial<ToastProps>
