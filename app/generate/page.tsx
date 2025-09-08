"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";
import AuthenticatedGeneratePage from "./authenticated";

export default function GeneratePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRoute = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is signed in, show authenticated generate page
          setIsAuthenticated(true);
        } else {
          // User is not signed in, redirect to free generate page
          router.replace("/free-generate");
          return;
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        // On error, redirect to free generate page
        router.replace("/free-generate");
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRoute();
  }, [router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyber-dark to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyber-cyan mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the full generate page
  if (isAuthenticated) {
    return <AuthenticatedGeneratePage />;
  }

  // This should not render as we redirect above
  return null;
}
