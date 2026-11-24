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
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl"><div className="mb-6"><img src="/assets/sepco1-logo-template.png" alt="SEPCO1" className="mb-5 h-12 max-w-48 object-contain"/><h1 className="text-2xl font-black text-slate-900">Acesso ao Frota One</h1><p className="mt-1 text-sm text-slate-600">Entre com o e-mail cadastrado e sua senha.</p></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">E-mail<input autoComplete="username" required type="email" className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-semibold">Senha<input autoComplete="current-password" required type="password" className="input mt-1" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div>}<button disabled={busy} className="btn-primary w-full justify-center">{busy ? "Entrando..." : "Entrar"}</button></form><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600"><p>Primeiro acesso? Use o link de convite enviado pelo administrador para criar sua senha.</p><a className="mt-3 inline-block font-semibold text-blue-700 underline" href="/signin-with-chatgpt?return_to=%2F">Entrar com a conta institucional</a></div></section></main>;
}
