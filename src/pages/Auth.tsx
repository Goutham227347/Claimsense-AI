import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { mockAuth } from "@/utils/auth";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [useMockAuth, setUseMockAuth] = useState(!mockAuth.isSupabaseConfigured());

  useEffect(() => {
    // Check for existing mock session
    const mockSession = mockAuth.getMockSession();
    if (mockSession && useMockAuth) {
      navigate("/", { replace: true });
      return;
    }

    // Check Supabase session
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, useMockAuth]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email || !password) {
        toast.error("Please enter email and password.");
        setLoading(false);
        return;
      }
      
      // Use mock auth if Supabase isn't configured
      if (useMockAuth) {
        mockAuth.createMockSession(email);
        toast.success("Signed in with demo account!");
        navigate("/", { replace: true });
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully!");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Authentication failed.";
      console.error("Auth error:", errorMsg, err);
      
      // Fallback to mock auth on error
      if (!useMockAuth && errorMsg.includes("fetch")) {
        console.log("Supabase failed, switching to mock auth");
        setUseMockAuth(true);
        mockAuth.createMockSession(email);
        toast.success("Using demo mode. Signed in!");
        navigate("/", { replace: true });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });
      if (error) {
        const errorMsg = error instanceof Error ? error.message : error?.message ?? "Google sign-in failed.";
        console.error("Google OAuth error:", errorMsg, error);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Google sign-in failed.";
      console.error("Google OAuth error:", errorMsg, err);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif-display font-semibold text-2xl tracking-tight">
            ClaimSense
          </div>
          <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-mono-archive mt-1">
            Trainee Console · v.1.0
          </div>
        </div>

        <div className="border border-border bg-card rounded-md p-6">
          <h1 className="font-serif-display text-xl mb-1">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-xs text-muted-foreground mb-5">
            {mode === "signin"
              ? "Access the indexed claim manuals."
              : "Register to query and deposit manuals."}
          </p>

          <button
            onClick={onGoogle}
            disabled={loading}
            className="w-full text-sm border border-border hover:border-foreground bg-background transition-colors px-3 py-2 rounded-sm mb-4 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-mono-archive">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainee@example.com"
              className="w-full text-sm bg-background border border-border rounded-sm px-3 py-2 outline-none focus:border-foreground"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full text-sm bg-background border border-border rounded-sm px-3 py-2 outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-foreground text-background h-9 rounded text-xs font-medium tracking-wide hover:bg-accent transition-colors disabled:opacity-40"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-4"
          >
            {mode === "signin"
              ? "No account? Register →"
              : "Already registered? Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
