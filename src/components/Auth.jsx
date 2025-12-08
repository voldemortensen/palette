import { createSignal } from 'solid-js';
import { supabase } from '../utils/supabase';

export default function Auth(props) {
  const [loading, setLoading] = createSignal(false);
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [isSignUp, setIsSignUp] = createSignal(false);
  const [error, setError] = createSignal('');

  const continueAsGuest = () => {
    localStorage.setItem('guestMode', 'true');
    if (props.onGuestMode) {
      props.onGuestMode();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp()) {
        const { error } = await supabase.auth.signUp({
          email: email(),
          password: password(),
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email(),
          password: password(),
        });
        if (error) throw error;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">
          Palette Builder
        </h1>
        <h2 class="text-xl font-semibold text-gray-700 mb-6 text-center">
          {isSignUp() ? 'Create Account' : 'Sign In'}
        </h2>

        <div class="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            class="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('github')}
            class="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div class="relative mb-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleAuth} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength="6"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error() && (
            <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error()}
            </div>
          )}

          <button
            type="submit"
            disabled={loading()}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading() ? 'Loading...' : isSignUp() ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div class="mt-6 text-center space-y-3">
          <button
            onClick={() => setIsSignUp(!isSignUp())}
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isSignUp()
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button
            onClick={continueAsGuest}
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Continue as Guest
          </button>
          <p class="text-xs text-gray-500">
            Try the app without an account. Your data stays local.
          </p>
        </div>
      </div>
    </div>
  );
}
