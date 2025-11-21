// lib/safeCurrentUser.ts
import { currentUser } from "@clerk/nextjs/server";

export async function safeCurrentUser() {
  try {
    return await currentUser();
  } catch (err: any) {
    try {
      console.error("safeCurrentUser(): Clerk currentUser threw:", {
        name: err?.name,
        message: err?.message ?? "(no message)",
        stack: err?.stack,
        props: Object.getOwnPropertyNames(err || {}).reduce((acc: any, k: string) => {
          try {
            acc[k] = (err as any)[k];
          } catch {
            acc[k] = "<unreadable>";
          }
          return acc;
        }, {}),
      });
    } catch (logErr) {
      // Ensure logging doesn't crash render
      console.error("safeCurrentUser(): error while logging the error", logErr);
    }
    return null;
  }
}
