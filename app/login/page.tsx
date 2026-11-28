"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Não foi possível entrar."); setBusy(false); return; }
      window.location.replace("/");
    } catch { setMessage("Não foi possível conectar ao sistema."); setBusy(false); }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#04153F] bg-cover bg-center p-4" style={{ backgroundImage: "url('/assets/login-bg.png'), linear-gradient(135deg, #04153F 0%, #0A2E7A 55%, #031033 100%)" }}>
      <div className="relative z-10 w-full max-w-[430px]">
        <section className="rounded-[26px] border border-white/30 bg-white/95 px-8 pt-8 pb-7 shadow-[0_28px_70px_-15px_rgba(2,8,23,0.85)] backdrop-blur-sm">
          <div className="mb-5 flex flex-col items-center">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 120 74" className="h-14 w-auto" aria-hidden="true">
                <path d="M12 42 C24 8, 86 4, 112 22 C84 14, 34 18, 22 44 Z" fill="#DC2626" />
                <path d="M28 48 L28 32 L54 32 L64 43 L64 56 L24 56 L24 48 Z" fill="#0A1E46" />
                <path d="M44 35 L53 35 L60 43 L44 43 Z" fill="#FFFFFF" />
                <rect x="14" y="46" width="12" height="10" rx="2" fill="#0A1E46" />
                <circle cx="26" cy="58" r="6.5" fill="#0A1E46" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="53" cy="58" r="6.5" fill="#0A1E46" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              <div className="leading-none">
                <div className="text-[26px] font-black tracking-tight text-[#0A1E46]">Frota One</div>
                <div className="mt-0.5 text-[21px] font-medium italic text-[#1E3A6D]">Gestão</div>
              </div>
            </div>
          </div>

          <h1 className="text-center text-[22px] font-extrabold tracking-tight text-[#0F172A]">Acesse o sistema Frota One Gestão</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Entre com o e-mail cadastrado e sua senha.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Mail size={15} className="text-slate-500" />E-mail</span>
              <input autoComplete="username" type="email" placeholder="seu.email@empresa.com" className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" />Senha</span>
              <div className="relative">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600" tabIndex={-1}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Lembrar meu acesso</label>
              <a href="/setup-master" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">Configuração master</a>
            </div>

            {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">{message}</div>}

            <button type="submit" disabled={busy} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9162A] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-[#B91C1C] disabled:opacity-60">
              <LogIn size={17} />{busy ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-3.5 text-center text-xs text-slate-500">Funcionário novo? Use o convite enviado pelo administrador.</div>
        </section>

        <p className="mt-4 text-center text-xs font-medium tracking-wide text-white/90 drop-shadow">SEPCO1 Construções do Brasil &nbsp;|&nbsp; Frota One Gestão</p>
      </div>
    </main>
  );
}