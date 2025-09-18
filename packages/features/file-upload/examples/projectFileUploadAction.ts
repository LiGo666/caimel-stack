"use server";

/**
 * Example of a project-specific file upload action
 * This shows how the factorized action would be used in a real project
 */

import { createFileUploadAction } from "./audioFileUploadAction";

// Create a specialized file upload action for this project
const { generateUploadTokens, finalizeUpload, cancelUpload } = createFileUploadAction({
  bucketName: "project-documents",
  folder: "contract-uploads",
  allowedTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  maxSizeMB: 20, // 20MB max file size
});

// Export the functions to be used in the project
export { generateUploadTokens, finalizeUpload, cancelUpload };

/**
 * Example client-side usage:
 * 
 * // React component
 * import { generateUploadTokens, finalizeUpload, cancelUpload } from "@/actions/fileUpload";
 * 
 * async function handleFileUpload(file) {
 *   // Get upload token
 *   const [token] = await generateUploadTokens(1);
 *   
 *   // Create form data
 *   const formData = new FormData();
 *   
 *   // Add all required form fields from token.formData
 *   Object.entries(token.formData).forEach(([key, value]) => {
 *     formData.append(key, value);
 *   });
 *   
 *   // Add the file
 *   formData.append('file', file);
 *   
 *   try {
 *     // Upload the file
 *     const response = await fetch(token.uploadUrl, {
 *       method: 'POST',
 *       body: formData,
 *     });
 *     
 *     if (response.ok) {
 *       // Finalize the upload
 *       await finalizeUpload(token.tokenId);
 *       return true;
 *     } else {
 *       // Cancel the upload on error
 *       await cancelUpload(token.tokenId);
 *       return false;
 *     }
 *   } catch (error) {
 *     // Cancel the upload on error
 *     await cancelUpload(token.tokenId);
 *     return false;
 *   }
 * }
 */
