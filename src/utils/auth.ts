// Development authentication helper
// This provides a fallback when Supabase isn't configured

export interface MockSession {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}

const MOCK_SESSION_KEY = "claimsense_mock_session";
const DEMO_MODE = import.meta.env.MODE === "development";

export const mockAuth = {
  // Check if user has a mock session
  getMockSession: (): MockSession | null => {
    if (!DEMO_MODE) return null;
    const stored = localStorage.getItem(MOCK_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Create a mock session for testing
  createMockSession: (email: string): MockSession => {
    const session: MockSession = {
      user: {
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email,
      },
      access_token: `mock_token_${Math.random().toString(36).substr(2, 20)}`,
    };
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Clear mock session
  clearMockSession: () => {
    localStorage.removeItem(MOCK_SESSION_KEY);
  },

  // Check if Supabase is configured
  isSupabaseConfigured: (): boolean => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return !!(url && key && url.length > 0 && key.length > 0);
  },
};
