"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo(
          "Cuenta creada. Si la confirmacion de email esta activa, revisa tu bandeja para confirmar antes de entrar."
        );
        setMode("signin");
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-avante-navy px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-avante-accent text-2xl font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">Avante Reports Platform</h1>
          <p className="text-sm text-slate-400">
            Panel de control central · 13 reportes
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-white text-avante-navy shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Iniciar sesion
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-avante-navy shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label">Nombre completo</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
            )}
            <div>
              <label className="label">Correo</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@complejoavante.com"
              />
            </div>
            <div>
              <label className="label">Contrasena</label>
              <input
                type="password"
                required
                minLength={6}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {info}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "signin" ? "Entrar" : "Registrarme"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          AVANTE · Confidencial · Solo uso interno
        </p>
      </div>
    </div>
  );
}
