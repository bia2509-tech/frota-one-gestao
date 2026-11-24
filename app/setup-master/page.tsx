"use client";
import { useState } from "react";
import type { FormEvent } from "react";

export default function SetupMasterPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    if (password.length < 12) return setMessage("A senha precisa ter pelo menos 12 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não conferem.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/bootstrap-master", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token, password }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Não foi possível configurar o acesso master."); setBusy(false); return; }
      window.location.replace("/");
    } catch { setMessage("Não foi possível conectar ao sistema."); setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl"><img src="/assets/sepco1-logo-template.png" alt="SEPCO1" className="mb-5 h-12 max-w-48 object-contain"/><h1 className="text-2xl font-black text-slate-900">Configuração inicial do administrador master</h1><p className="mt-2 text-sm text-slate-600">Use o e-mail já cadastrado para a conta master e o código temporário fornecido pela equipe responsável pelo Cloudflare.</p><form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-semibold">E-mail do administrador master<input autoComplete="username" required type="email" className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-semibold">Código temporário<input autoComplete="one-time-code" required type="password" className="input mt-1" value={token} onChange={(event) => setToken(event.target.value)} /></label><label className="block text-sm font-semibold">Nova senha<input autoComplete="new-password" required minLength={12} type="password" className="input mt-1" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block text-sm font-semibold">Confirmar nova senha<input autoComplete="new-password" required minLength={12} type="password" className="input mt-1" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div>}<button disabled={busy} className="btn-primary w-full justify-center">{busy ? "Configurando..." : "Criar senha master"}</button></form><a className="mt-4 inline-block text-sm font-semibold text-blue-700 underline" href="/login">Voltar ao login</a></section></main>;
}
