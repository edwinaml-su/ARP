"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "recover";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Detecta el enlace de recuperacion de contrasena. Supabase devuelve el token
  // en el fragmento (#access_token=...&type=recovery), que solo existe en el
  // cliente. Escuchamos el evento PASSWORD_RECOVERY y, como respaldo, leemos el
  // hash directamente para establecer la sesion y mostrar el formulario.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recover");
        setError(null);
        setInfo(null);
      }
    });

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("access_token") && hash.includes("type=recovery")) {
      setMode("recover");
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token });
      }
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendReset() {
    if (!email) {
      setError("Escribe tu correo para enviarte el enlace de restablecimiento.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(
      "Te enviamos un correo con el enlace para restablecer tu contrasena. Revisa tu bandeja."
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "recover") {
      if (password !== password2) {
        setError("Las contrasenas no coinciden.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

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
          {mode === "recover" ? (
            <>
              <h2 className="mb-1 text-lg font-semibold text-avante-navy">
                Restablecer contrasena
              </h2>
              <p className="mb-5 text-sm text-slate-500">
                Escribe tu nueva contrasena para completar el restablecimiento.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Nueva contrasena</label>
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
                <div>
                  <label className="label">Confirmar contrasena</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
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
                  Guardar contrasena
                </button>
              </form>
            </>
          ) : (
            <>
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
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={sendReset}
                      className="mt-2 text-xs font-medium text-avante-navy hover:underline"
                    >
                      Olvidaste tu contrasena?
                    </button>
                  )}
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
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          AVANTE · Confidencial · Solo uso interno
        </p>
      </div>
    </div>
  );
}
