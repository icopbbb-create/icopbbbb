"use client";

import { useEffect } from "react";
import styles from "./UltraFlameCursor.module.css";

/**
 * Minimal placeholder UltraFlameCursor
 * - Safe, renders nothing visible
 * - Removes any leftover body classes that would hide the regular cursor
 * - Keeps the module import so build doesn't fail if other files still import it
 */

export default function UltraFlameCursor() {
  useEffect(() => {
    // remove any classes that previously hid the default cursor
    // (safe no-op if they don't exist)
    document.body.classList.remove(
      "animated-cursor-active",
      "ultraflame-active",
      "flame-cursor-active",
      "animated-flame-active",
      "ultraflame-active"
    );

    // restore default cursor style on body just in case
    document.body.style.cursor = "";

    // nothing to cleanup specifically
    return () => {
      // keep body clean on unmount
      document.body.classList.remove(
        "animated-cursor-active",
        "ultraflame-active",
        "flame-cursor-active",
        "animated-flame-active",
        "ultraflame-active"
      );
      document.body.style.cursor = "";
    };
  }, []);

  // no visible DOM so it won't affect layout
  return null;
}
