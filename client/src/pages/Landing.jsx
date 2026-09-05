import { Link } from 'react-router-dom';
import { Card } from '../components/ui.jsx';

const steps = [
  ['1. Requirements', 'Capture the brief and scope in one place both sides can see.'],
  ['2. Tasks & milestones', 'Break the work down, track progress, hit deadlines.'],
  ['3. Files & messages', 'Deliverables and conversation stay attached to the project.'],
  ['4. Approvals', 'Clients approve or request changes — decisions are on record.'],
];

export default function Landing() {
  return (
    <main className="container">
      <section className="hero">
        <h1>One shared workspace for you and your clients</h1>
        <p>
          ClientSync takes a project from requirements to completion — tasks, milestones, files,
          messages and client approvals in a single place. No more chasing email threads.
        </p>
        <div className="hero-actions">
          <Link className="btn" to="/register">
            Create your account
          </Link>
          <Link className="btn secondary" to="/login">
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid grid-cards" style={{ paddingBottom: 64 }}>
        {steps.map(([title, body]) => (
          <Card key={title} className="card-pad stack gap-8">
            <h3 style={{ fontSize: 15 }}>{title}</h3>
            <p className="small muted">{body}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
