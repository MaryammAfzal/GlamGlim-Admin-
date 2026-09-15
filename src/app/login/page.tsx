"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Unable to login.");
      setLoading(false);
      return;
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();

      setError("You are not authorized to access the admin portal.");
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white border border-[#E5D9D0] rounded-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#5B1A1A]">
            Glam Glim
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Admin Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#5B1A1A]"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#5B1A1A]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5B1A1A] text-white py-2.5 rounded-md text-sm font-medium hover:bg-[#7A2323] transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-[#5B1A1A]"
          >
            ← Back to store
          </a>
        </div>
      </div>
    </div>
  );
}