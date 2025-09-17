"use server";

/**
 * Simple server action that returns a string
 * This will be rate-limited by the middleware
 */
// Constants
const SIMULATION_DELAY_MS = 100;

export async function callServerAction(): Promise<string> {
  // Add a small delay to simulate server processing
  await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY_MS));
  return "Hello from the server action!";
}
