'use client';

export default function SessionView({ transcript }: { transcript: string | null }) {
  if (!transcript) {
    return (
      <div className="text-gray-500 text-center p-8">
        No transcript available for this session.
      </div>
    );
  }

  const lines = transcript.split('\n').filter(Boolean);

  return (
    <div className="space-y-4 p-4">
      {lines.map((line, i) => {
        const isAssistant = line.startsWith('assistant:');
        const text = line.replace(/^assistant:|^user:/, '').trim();

        return (
          <div
            key={i}
            className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
              isAssistant
                ? 'bg-gray-100 text-gray-900 self-start'
                : 'bg-orange-50 text-orange-900 self-end ml-auto'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {isAssistant ? 'Tutor' : 'You'}
            </div>
            <div className="whitespace-pre-wrap">{text}</div>
          </div>
        );
      })}
    </div>
  );
}
