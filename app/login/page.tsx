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
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-4 select-none" style={{ background: "radial-gradient(circle at 16% 68%, rgba(251,146,60,0.92) 0%, rgba(234,88,12,0.55) 18%, rgba(29,78,216,0.45) 42%, rgba(5,24,74,0.96) 72%, #031033 100%)" }}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="sg" cx="17%" cy="68%" r="42%"><stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" /><stop offset="28%" stopColor="#FB923C" stopOpacity="0.78" /><stop offset="62%" stopColor="#1D4ED8" stopOpacity="0.22" /><stop offset="100%" stopColor="#04153F" stopOpacity="0" /></radialGradient>
          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#431407" stopOpacity="0.92" /><stop offset="45%" stopColor="#0F172A" stopOpacity="0.95" /><stop offset="100%" stopColor="#020817" stopOpacity="0.98" /></linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sg)" />
        <path d="M0 695 Q420 675 880 715 T1600 725 L1600 900 L0 900 Z" fill="url(#gg)" />
        <path d="M0 785 Q280 735 610 865 L0 900 Z" fill="#7C2D12" opacity="0.55" />
        <g stroke="#0A1633" strokeWidth="4" fill="none" opacity="0.88">
          <path d="M235 695 L278 210 L302 210 L345 695" />
          <path d="M245 580 L335 580 M254 470 L326 470 M262 360 L318 360 M270 270 L310 270" />
          <path d="M245 580 L326 470 M335 580 L254 470 M254 470 L318 360 M326 470 L262 360 M262 360 L310 270 M318 360 L270 270" strokeWidth="2.5" />
          <path d="M185 280 L395 280 L365 258 L215 258 Z M165 365 L415 365 L380 342 L200 342 Z M195 450 L385 450 L355 430 L225 430 Z" />
          <path d="M185 280 Q410 345 620 330 M395 280 Q530 335 660 330 M165 365 Q410 430 610 400 M415 365 Q535 415 670 400 M0 325 Q95 310 185 280 M0 410 Q85 395 165 365" strokeWidth="1.8" opacity="0.65" />
        </g>
        <g stroke="#0F2147" strokeWidth="2.5" fill="none" opacity="0.72">
          <path d="M615 705 L642 300 L656 300 L683 705 M585 335 L713 335 M575 400 L723 400 M592 465 L706 465 M622 600 L676 600 M628 510 L670 510 M634 420 L664 420" />
        </g>
        <g transform="translate(365, 555)" opacity="0.92">
          <rect x="25" y="128" width="135" height="26" rx="13" fill="#060D1D" stroke="#F59E0B" strokeWidth="1.5" />
          <circle cx="44" cy="141" r="7" fill="#334155" /><circle cx="72" cy="141" r="6" fill="#334155" /><circle cx="100" cy="141" r="6" fill="#334155" /><circle cx="140" cy="141" r="7" fill="#334155" />
          <rect x="32" y="84" width="118" height="42" rx="6" fill="#D97706" /><rect x="35" y="88" width="66" height="34" rx="4" fill="#B45309" />
          <rect x="104" y="64" width="44" height="60" rx="5" fill="#F59E0B" /><rect x="112" y="70" width="30" height="28" rx="3" fill="#1E293B" />
          <path d="M138 94 L208 26 L226 36 L154 108 Z" fill="#D97706" /><path d="M214 28 L254 96 L240 104 L204 38 Z" fill="#B45309" /><path d="M242 98 L272 106 L264 134 L234 126 Z" fill="#0F172A" />
        </g>
        <g transform="translate(35, 515)">
          <path d="M12 38 L188 56 L188 152 L18 152 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <path d="M35 68 L175 80 M35 98 L175 106 M35 126 L175 130" stroke="#CBD5E1" strokeWidth="3" />
          <rect x="15" y="152" width="295" height="22" rx="4" fill="#0F172A" />
          <path d="M196 42 L274 42 L306 94 L306 154 L196 154 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M246 52 L272 52 L296 92 L246 92 Z" fill="#1E293B" /><rect x="206" y="54" width="32" height="38" rx="3" fill="#334155" />
          <rect x="278" y="102" width="24" height="34" rx="3" fill="#1E293B" /><rect x="284" y="140" width="18" height="8" rx="2" fill="#FEF08A" />
          <circle cx="62" cy="176" r="28" fill="#090D16" stroke="#475569" strokeWidth="4" /><circle cx="62" cy="176" r="12" fill="#94A3B8" />
          <circle cx="128" cy="176" r="28" fill="#090D16" stroke="#475569" strokeWidth="4" /><circle cx="128" cy="176" r="12" fill="#94A3B8" />
          <circle cx="258" cy="176" r="28" fill="#090D16" stroke="#475569" strokeWidth="4" /><circle cx="258" cy="176" r="12" fill="#94A3B8" />
        </g>
        <path d="M0 0 L430 0 C285 45 145 125 0 245 Z" fill="#1D4ED8" opacity="0.88" />
        <path d="M0 0 L345 0 C215 35 105 98 0 190 Z" fill="#DC2626" />
        <path d="M1600 900 L1110 900 C1275 845 1435 735 1600 560 Z" fill="#0F2D7A" opacity="0.95" />
        <path d="M1600 900 L1215 900 C1355 855 1485 770 1600 645 Z" fill="#DC2626" />
      </svg>

      <div className="relative z-10 w-full max-w-[440px]">
        <section className="relative overflow-hidden rounded-[28px] border border-white/25 bg-white px-8 pt-8 pb-7 shadow-[0_28px_70px_-15px_rgba(2,8,23,0.85)]">
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

          <h1 className="text-center text-[23px] font-extrabold tracking-tight text-[#0F172A]">Acesse o sistema Frota One Gestão</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Entre com o e-mail cadastrado e sua senha.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Mail size={15} className="text-slate-500" />E-mail</span>
              <input autoComplete="username" type="email" placeholder="seu.email@empresa.com" className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" />Senha</span>
              <div className="relative">
                <input autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20" value={password} onChange={(e) => setPassword(e.target.value)} required />
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

          <div className="relative z-10 mt-6 border-t border-slate-100 pt-3.5 text-center text-xs text-slate-500">Funcionário novo? Use o convite enviado pelo administrador.</div>

          <svg viewBox="0 0 440 54" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-[0.07]" aria-hidden="true">
            <path d="M0 44 Q110 34 220 42 T440 38 L440 54 L0 54 Z" fill="#0F172A" />
            <g transform="translate(105, 8)" fill="#0F172A"><rect x="8" y="28" width="44" height="9" rx="4" /><rect x="12" y="14" width="32" height="13" rx="2" /><path d="M42 18 L66 2 L72 6 L48 22 Z" /><path d="M68 4 L80 24 L74 26 L64 7 Z" /></g>
            <g transform="translate(245, 10)" fill="#0F172A"><rect x="6" y="10" width="48" height="20" rx="2" /><path d="M56 12 L74 12 L82 22 L82 30 L56 30 Z" /><circle cx="18" cy="33" r="6" /><circle cx="44" cy="33" r="6" /><circle cx="70" cy="33" r="6" /></g>
          </svg>
        </section>

        <p className="mt-4 text-center text-xs font-medium tracking-wide text-slate-200/90 drop-shadow">SEPCO1 Construções do Brasil &nbsp;|&nbsp; Frota One Gestão</p>
      </div>
    </main>
  );
}
