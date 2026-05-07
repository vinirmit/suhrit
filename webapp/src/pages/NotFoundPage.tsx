import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="app-loading">
      <section className="card pad-2 text-center">
        <h1>404</h1>
        <p className="muted">The page you requested was not found.</p>
        <Link className="button button--primary" to="/search">
          Go to Search
        </Link>
      </section>
    </div>
  );
}
