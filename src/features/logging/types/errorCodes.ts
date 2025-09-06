import { ERROR_CATALOG } from "../config/errorCodes"

/**
 * Union of all valid error codes ("ERROR-100001" | "ERROR-100002" | ...)
 */
export type ErrorCode = keyof typeof ERROR_CATALOG
