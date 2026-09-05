import { Link } from 'react-router-dom';
import { useAuth } from '../lib/hooks.jsx';
import { Card, Empty } from '../components/ui.jsx';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <main className="container page">
      <Card>
        <Empty
          icon="?"
          title="Page not found"
          hint="The page you are looking for does not exist or has moved."
          action={
            <Link className="btn" to={user ? '/dashboard' : '/'}>
              {user ? 'Go to dashboard' : 'Go home'}
            </Link>
          }
        />
      </Card>
    </main>
  );
}
