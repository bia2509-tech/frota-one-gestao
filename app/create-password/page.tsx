"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

export default function CreatePasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    if (!token) return setMessage("O convite está incompleto.");
    if (password.length < 12) return setMessage("A senha precisa ter pelo menos 12 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não conferem.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/invitation", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Não foi possível criar a senha."); setBusy(false); return; }
      setDone(true);
    } catch { setMessage("Não foi possível conectar ao sistema."); }
    setBusy(false);
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl"><img src="/assets/sepco1-logo-template.png" alt="SEPCO1" className="mb-5 h-12 max-w-48 object-contain"/><h1 className="text-2xl font-black text-slate-900">Criar senha de acesso</h1>{done ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><p className="font-semibold">Senha criada. Seu acesso aos módulos aprovados está pronto.</p><a href="/login" className="mt-3 inline-block font-bold text-blue-700 underline">Ir para o login</a></div> : <><p className="mt-1 text-sm text-slate-600">Crie uma senha pessoal com pelo menos 12 caracteres.</p><form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Nova senha<input autoComplete="new-password" required minLength={12} type="password" className="input mt-1" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block text-sm font-semibold">Confirmar senha<input autoComplete="new-password" required minLength={12} type="password" className="input mt-1" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div>}<button disabled={busy || !token} className="btn-primary w-full justify-center">{busy ? "Salvando..." : "Criar minha senha"}</button></form></>}</section></main>;
}
