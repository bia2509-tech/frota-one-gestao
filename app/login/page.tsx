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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#04153F] p-4 lg:block lg:p-0" style={{ backgroundImage: "url('/assets/login-bg.png')", backgroundSize: "100% 100%", backgroundPosition: "center" }}>
      <section className="relative z-10 flex w-full max-w-[440px] flex-col justify-between overflow-hidden rounded-[26px] bg-white px-8 pt-6 pb-0 shadow-2xl lg:fixed lg:left-[39.2%] lg:top-[13.2%] lg:h-[75.2%] lg:w-[36.2%] lg:max-w-none lg:px-10 lg:pt-7">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-3 flex justify-center">
            <img src="/assets/frota-one-logo.png" alt="Frota One Gestão" className="h-24 w-auto object-contain" />
          </div>

          <h1 className="text-center text-[22px] font-extrabold tracking-tight text-[#0F172A]">Acesse o sistema Frota One Gestão</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Entre com o e-mail cadastrado e sua senha.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Mail size={15} className="text-slate-500" />E-mail</span>
              <input autoComplete="username" type="email" placeholder="seu.email@empresa.com" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" />Senha</span>
              <div className="relative">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600" tabIndex={-1}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />Lembrar meu acesso</label>
              <a href="/setup-master" className="font-semibold text-blue-600 hover:underline">Configuração master</a>
            </div>

            {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">{message}</div>}

            <button type="submit" disabled={busy} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9162A] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-[#B91C1C] disabled:opacity-60">
              <LogIn size={17} />{busy ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">Funcionário novo? Use o convite enviado pelo administrador.</p>
        </div>

        <img src="/assets/login-card-footer.png" alt="" aria-hidden="true" className="-mx-10 mt-2 w-[calc(100%+5rem)] max-w-none object-cover opacity-90" />
      </section>
    </main>
  );
}