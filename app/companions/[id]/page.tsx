// app/companions/[id]/page.tsx
import * as companionActions from "@/lib/actions/companion.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getSubjectColor, subjectToIconFilename } from "@/lib/utils";
import Image from "next/image";
import CompanionComponent from "@/components/CompanionComponent";

interface CompanionSessionPageProps {
  params: { id: string };
}

export default async function CompanionSession({ params }: CompanionSessionPageProps) {
  const { id } = params;

  // pick a sensible exported function name from the companion actions module
  const getCompanionFn =
    (companionActions as any).getCompanion ??
    (companionActions as any).getCompanionById ??
    (companionActions as any).fetchCompanion ??
    (companionActions as any).getById ??
    (companionActions as any).getCompanionRecord ??
    null;

  if (!getCompanionFn || typeof getCompanionFn !== "function") {
    // Helpful runtime error to guide you to the real export in companion.actions
    throw new Error(
      "companion.actions module does not export a recognized getCompanion function. " +
      "Open lib/actions/companion.actions.ts and either export `getCompanion` " +
      "or adjust the list of candidate names in this file."
    );
  }

  const companion = await getCompanionFn(id);
  const user = await currentUser();

  if (!user) redirect("/sign-in");
  if (!companion) notFound();

  // Pull only the plain fields we need and pass them explicitly.
  const {
    id: companionId,
    name = "Untitled Companion",
    subject = "general",
    topic = "",
    duration = 15,
    style = "",
    voice = "",
  } = companion as any;

  const userName = user?.firstName ?? "Learner";
  const userImage = user?.imageUrl ?? undefined;

  // Keep server-only logic (colors/icons) here — client only receives serializable values.
  const iconFile = subjectToIconFilename(subject || "");
  const subjectColor = getSubjectColor(subject || "");

  return (
    <main>
      {/* Header / top info */}
      <article className="flex rounded-border justify-between p-6 max-md:flex-col">
        <div className="flex items-center gap-2">
          <div
            className="size-[72px] flex items-center justify-center rounded-lg max-md:hidden"
            style={{ backgroundColor: subjectColor }}
          >
            <Image src={`/icons/${iconFile}.svg`} alt={subject} width={35} height={35} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-bold text-2xl">{name}</p>
              <div className="subject-badge max-sm:hidden">{subject}</div>
            </div>

            <p className="text-lg">{topic}</p>
          </div>
        </div>

        <div className="items-start text-2xl max-md:hidden">{duration} minutes</div>
      </article>

      {/* Pass explicit props only (no spreading of `companion`) */}
      <CompanionComponent
        companionId={String(companionId)}
        name={String(name)}
        subject={String(subject)}
        topic={String(topic)}
        duration={Number(duration)}
        style={String(style)}
        voice={String(voice)}
        userName={String(userName)}
        userImage={userImage ? String(userImage) : undefined}
      />
    </main>
  );
}
