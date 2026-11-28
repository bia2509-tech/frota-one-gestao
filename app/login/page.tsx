"use client";
import { useState } from "react";
import type { FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Não foi possível entrar."); setBusy(false); return; }
      window.location.replace("/");
    } catch { setMessage("Não foi possível conectar ao sistema."); setBusy(false); }
  }
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#060D1F] p-4" style={{ backgroundImage: "radial-gradient(circle at 18% 20%, rgba(29, 78, 216, 0.34), transparent 42%), radial-gradient(circle at 84% 78%, rgba(225, 29, 72, 0.24), transparent 45%), linear-gradient(135deg, #050B1A 0%, #0A1736 52%, #071024 100%)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(148, 163, 184, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.16) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-600/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      <div className="relative z-10 w-full max-w-md"><section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.65)] backdrop-blur-md"><div className="mb-6"><img src="/assets/sepco1-logo-template.png" alt="SEPCO1" className="mb-5 h-12 max-w-48 object-contain"/><h1 className="text-2xl font-black text-slate-900">Acesso ao Frota One Gestão</h1><p className="mt-1 text-sm text-slate-600">Entre com o e-mail cadastrado e sua senha.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">E-mail<input autoComplete="username" required type="email" className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-semibold">Senha<input autoComplete="current-password" required type="password" className="input mt-1" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div>}<button disabled={busy} className="btn-primary w-full justify-center">{busy ? "Entrando..." : "Entrar"}</button></form><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600"><p>Funcionário novo? Use o convite enviado pelo administrador para criar sua senha.</p><p className="mt-3">Primeira configuração master? <a className="font-semibold text-blue-700 underline" href="/setup-master">Criar senha do administrador</a></p></div></section><p className="mt-4 text-center text-xs tracking-wide text-slate-400/80">SEPCO1 Construções do Brasil · Frota One Gestão</p></div></main>;
}
