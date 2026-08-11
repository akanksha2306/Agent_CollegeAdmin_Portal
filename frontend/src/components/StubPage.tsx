interface StubPageProps {
  title: string;
  description: string;
  phase?: string;
}

/** Placeholder for a section that's planned but not yet built. */
export function StubPage({ title, description, phase = 'Phase 2' }: StubPageProps) {
  return (
    <div>
      <header className="page-head">
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </header>
      <div className="card stub-card">
        <span className="stub-badge">Coming soon · {phase}</span>
        <p className="muted">This section is planned and not yet built. It's on the roadmap for a later phase.</p>
      </div>
    </div>
  );
}
