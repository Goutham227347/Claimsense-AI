// OAuth authentication using Supabase
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      try {
        // Map provider names to Supabase providers
        let supabaseProvider: "google" | "apple" | "microsoft" = "google";
        if (provider === "apple") supabaseProvider = "apple";
        if (provider === "microsoft") supabaseProvider = "microsoft";

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: supabaseProvider,
          options: {
            redirectTo: opts?.redirect_uri || `${window.location.origin}/`,
          },
        });

        if (error) {
          return { error };
        }

        return { redirected: true };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
  },
};
