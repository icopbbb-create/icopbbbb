// app/companions/page.tsx
export const dynamic = "force-dynamic";

import { getAllCompanions, getUserSessions } from "@/lib/server/companion.actions";
import CompanionCard from "@/components/CompanionCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/SearchInput";
import SubjectFilter from "@/components/SubjectFilter";
import styles from "./companions.module.css";
import { safeCurrentUser } from "@/lib/safeCurrentUser";

type SearchParams = { [key: string]: string | string[] | undefined };

const CompanionsLibrary = async ({ searchParams }: { searchParams?: SearchParams }) => {
  // Safely await searchParams (addresses Next.js sync dynamic API warning)
  const rawParams = (await Promise.resolve(searchParams)) ?? {};
  const params = rawParams as Record<string, string | undefined>;

  const subject = params.subject ? String(params.subject).trim() : "";
  const topicParam = params.topic ? String(params.topic).trim() : "";
  const qParam = params.q ? String(params.q).trim() : "";

  // unify free-text search: prefer explicit q param, fallback to topic param (backwards compat)
  const searchTerm = qParam || topicParam || "";

  // determine current user (if any)
  let user: any = null;
  try {
    user = await safeCurrentUser();
  } catch (err: any) {
    console.error("safeCurrentUser() threw in companions library:", err);
    user = null;
  }

  // Fetch user-scoped recent sessions (strict: do NOT fall back to global recent sessions)
  let recentSessions: any[] = [];
  try {
    if (user?.id) {
      const rows = await getUserSessions(user.id, 50);
      recentSessions = Array.isArray(rows) ? rows.slice(0, 50) : [];
    } else {
      recentSessions = [];
    }
  } catch (err: any) {
    console.error("Failed to load recent sessions for companions library:", err);
    recentSessions = [];
  }

  // Fetch all companions, then filter to user's companions only (if user logged in)
  let companions: any[] = [];
  try {
    const compRes = await getAllCompanions({
      subject: subject || "",
      topic: topicParam || "",
      q: searchTerm || undefined,
      limit: 200,
      page: 1,
    });
    companions = Array.isArray(compRes) ? compRes : [];
  } catch (err: any) {
    console.error("Failed to load companions list:", err);
    companions = [];
  }

  // If user exists, filter companions to only those authored by this user (strict isolation).
  // This prevents showing other users' created companions on the library for logged-in users.
  let userCompanions: any[] = [];
  if (user?.id) {
    userCompanions = companions.filter((c: any) => {
      // some rows may use `author`, `user_id`, or `created_by` — check common fields
      const author = c?.author ?? c?.user_id ?? c?.created_by ?? null;
      return author === user.id;
    });
  } else {
    // If no user, keep global companions (public browsing). If you prefer to hide for anonymous users too,
    // set userCompanions = [] here instead.
    userCompanions = companions;
  }

  // helper to normalize text
  const normalize = (s?: any) => String(s ?? "").toLowerCase().trim();

  // Build recent companions list from user sessions (user-scoped)
  const recentCompanions: any[] = [];
  const seenIds = new Set<string | number>();
  const subjectNormalized = normalize(subject);

  for (const s of recentSessions ?? []) {
    const comp = s?.companion ?? s?.companions ?? null;
    if (!comp) continue;
    const id = comp.id ?? s.companion_id ?? null;
    if (!id) continue;
    if (seenIds.has(id)) continue;

    // If a subject filter is active, skip recent items that don't match
    if (subjectNormalized) {
      const compSubjectHay = `${comp.subject ?? ""} ${comp.topic ?? ""} ${comp.name ?? ""}`.toLowerCase();
      if (!compSubjectHay.includes(subjectNormalized)) {
        continue;
      }
    }

    seenIds.add(id);
    recentCompanions.push({
      ...comp,
      id,
      companion_image_url: comp.companion_image_url ?? comp.image_url ?? comp.photo_url ?? comp.icon_url ?? null,
      subject: comp.subject ?? "",
      topic: comp.topic ?? "",
      name: comp.name ?? "",
      duration: comp.duration ?? 0,
    });
  }

  // Build the remaining user-owned companions list (skip ones already added from recent)
  const remaining: any[] = [];
  for (const c of userCompanions ?? []) {
    const id = c?.id ?? null;
    if (!id) continue;
    if (seenIds.has(id)) continue;

    // If a subject filter is active, skip those that don't match
    if (subjectNormalized) {
      const hay = `${c.subject ?? ""} ${c.topic ?? ""} ${c.name ?? ""}`.toLowerCase();
      if (!hay.includes(subjectNormalized)) {
        continue;
      }
    }

    seenIds.add(id);
    remaining.push(c);
  }

  // Defensive client-side filter: use the unified searchTerm so it matches whatever param was set
  const clientFilter = (item: any) => {
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    const hay = `${item.name ?? ""} ${item.title ?? ""} ${item.topic ?? ""} ${item.subject ?? ""}`.toLowerCase();
    return hay.includes(needle);
  };

  const finalList = [...recentCompanions, ...remaining].filter(clientFilter);

  // UX choice: if the user is logged in and finalList is empty, show a clear message so it's obvious
  const showEmptyMessage = user?.id ? finalList.length === 0 : finalList.length === 0;

  return (
    <main className={styles.pageContainer}>
      <section className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Companion Library</h1>

        <div className={styles.controls}>
          <SearchInput />
          <SubjectFilter />
          {/* Show a small loader while a subject is selected so the user sees activity */}
          {subject ? <span className={styles.loader} aria-hidden title="Filtering"></span> : null}
        </div>
      </section>

      <section className={styles.gridWrap}>
        {showEmptyMessage ? (
          <div className={styles.noResults}>
            {user?.id
              ? "You don't have any companions or recent sessions yet."
              : "No companions found."}
          </div>
        ) : (
          <div className={styles.gridList}>
            {finalList.map((companion: any, idx: number) => (
              <div key={companion.id} className={styles.gridItem} data-idx={idx}>
                <CompanionCard
                  id={companion.id}
                  name={companion.name ?? companion.title ?? companion.topic ?? "Companion"}
                  topic={companion.topic ?? ""}
                  subject={companion.subject ?? ""}
                  duration={Math.max(0, Number(companion.duration ?? companion.metadata?.duration_minutes ?? 0))}
                  color={getSubjectColor(companion.subject ?? companion.name ?? "")}
                  bookmarked={Boolean(companion.bookmarked ?? false)}
                  companion_image_url={
                    companion.companion_image_url ??
                    companion.image_url ??
                    companion.photo_url ??
                    companion.icon_url ??
                    null
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default CompanionsLibrary;
