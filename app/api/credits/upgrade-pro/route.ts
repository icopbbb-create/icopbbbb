// app/api/credits/upgrade-pro/route.ts

import { NextResponse } from "next/server";

/**
 * This route used to perform an automatic 50,000-credit upgrade.
 * It is now intentionally disabled to prevent accidental credit changes.
 *
 * The Upgrade button now redirects to /subscription/recharge,
 * so this API is preserved only to avoid 404 errors.
 */

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message: "The /api/credits/upgrade-pro route is disabled. Please use /subscription/recharge instead."
    },
    { status: 410 } // 410 Gone (route intentionally removed)
  );
}
