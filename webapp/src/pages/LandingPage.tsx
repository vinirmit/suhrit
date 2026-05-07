import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../app/auth';

export default function LandingPage() {
  const { isAuthenticated, isLoading, authError, clearAuthError, signIn } = useAuth();
  const location = useLocation();
  const isAuthCallback =
    new URLSearchParams(location.search).has('code') &&
    new URLSearchParams(location.search).has('state');
  const [error, setError] = useState<string | null>(null);

  if (isLoading || isAuthCallback) {
    return <div className="app-loading">Checking user access...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/search" replace />;
  }

  const handleLogin = async () => {
    try {
      setError(null);
      clearAuthError();
      await signIn();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Login is not configured correctly.';
      setError(message);
    }
  };

  return (
    <div className="landing">
      <section className="landing__panel">
        <div className="landing__content">
          <div className="landing__story">
            <div className="landing__hero-image">
              <img src="/assets/images/landing-ayurveda.png" alt="Ancient Ayurveda practice scene" />
              <div className="landing__overlay">
                <figure className="landing__verse-card">
                  <blockquote className="landing__verse">
                    समदोषः समाग्निश्च समधातुमलक्रियः |
                    <br />
                    प्रसन्नात्मेन्द्रियमनाः स्वस्थ इत्यभिधीयते ||
                  </blockquote>
                </figure>

                <div className="landing__definition-grid">
                  <section className="landing__definition-card">
                    {/* <span className="landing__meta-label">English</span> */}
                    <h2 className="landing__headline">A person is considered healthy when:</h2>
                    <ul className="landing__definition-list">
                      <li>
                        The doshas (biological energies: Vata, Pitta, Kapha) are in balance.
                      </li>
                      <li>The agni (digestive fire) functions properly.</li>
                      <li>
                        The dhatus (body tissues) and malas (waste products) are in a state
                        of balance and efficient functioning.
                      </li>
                      <li>
                        The soul (atma), senses (indriyas), and mind (manas) are in a state
                        of bliss (prasanna).
                      </li>
                    </ul>
                  </section>

                  <section className="landing__definition-card">
                    {/* <span className="landing__meta-label">हिंदी</span> */}
                    <h2 className="landing__headline landing__headline--secondary">
                      कोई व्यक्ति तब स्वस्थ माना जाता है जब:
                    </h2>
                    <ul className="landing__definition-list">
                      <li>दोष (वात, पित्त, कफ) संतुलित हों।</li>
                      <li>अग्नि (पाचन शक्ति) सही तरीके से कार्य करे।</li>
                      <li>
                        धातुएं (शरीर के ऊतक) और मल (विसर्जन उत्पाद) संतुलित और प्रभावी
                        रूप से कार्य कर रहे हों।
                      </li>
                      <li>
                        आत्मा, इंद्रियां (ज्ञानेंद्रियां व कर्मेंद्रियां), और मन प्रसन्न
                        अवस्था में हों।
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>

          <div className="landing__entry">
            <div className="landing__entry-card">
              <div className="landing__entry-top">
                <div className="landing__entry-brand">
                  <img src="/assets/images/logo-transparent-darktext.png" alt="Suhrit" className="landing__entry-logo" />
                </div>
                <button className="button button--primary button--full" onClick={() => void handleLogin()}>
                  Login
                </button>
              </div>

              <div className="landing__entry-copy">
                <p className="landing__meta-label">Staff Access</p>
                <h2 className="landing__entry-title">Sign in to continue</h2>
                <p className="muted">
                  Continue with your Google account to enter the clinic workspace.
                </p>
              </div>

              {error || authError ? (
                <div className="surface pad-1">
                  <strong>Access notice</strong>
                  <p className="muted">{error ?? authError}</p>
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      setError(null);
                      clearAuthError();
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
