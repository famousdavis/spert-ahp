interface StubInfo {
  title: string;
  description: string;
  icon: string;
}

const STUBS: StubInfo[] = [
  {
    title: 'Invite Collaborators',
    description: 'Share your decision with team members and collect their independent pairwise comparisons.',
    icon: '👥',
  },
  {
    title: 'Real-time Sync',
    description: 'See responses arrive in real time with Firebase-backed cloud storage.',
    icon: '🔄',
  },
  {
    title: 'Role Management',
    description: 'Assign roles (Owner, Facilitator, Voter, Observer) with different access levels.',
    icon: '🔐',
  },
];

export default function CollaborationStubs() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Collaboration</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STUBS.map((stub) => (
          <div key={stub.title} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{stub.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{stub.title}</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                    Phase 2
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{stub.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
