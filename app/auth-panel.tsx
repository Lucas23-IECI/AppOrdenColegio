import {useEffect, useState} from 'react';
import {ArrowRight, Copy, LogOut, Eye, EyeOff, Loader2, Users} from 'lucide-react';
import {api} from '../lib/sync';
import {ROLE_LABELS, type User} from '../lib/model';
import {clearEntryLink} from '../lib/auth-entry';

export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>(() => location.hash === '#login' ? 'login' : 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  useEffect(() => {
    // Old setup/invite links now lead to the same open registration form.
    clearEntryLink();
    if (location.hash && !location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + location.search);
  }, []);
  useEffect(() => setShowPassword(false), [mode]);

  return <section className="panel auth-panel">
    <div className="auth-tabs" role="group" aria-label="Acceso a la aplicación">
      <button type="button" aria-pressed={registering} disabled={busy} onClick={() => {setMode('register'); setError('');}}>Crear cuenta</button>
      <button type="button" aria-pressed={!registering} disabled={busy} onClick={() => {setMode('login'); setError('');}}>Ya tengo cuenta</button>
    </div>
    <div className="auth-heading">
      <p className="eyebrow">{registering ? 'SUMA TU REGISTRO AL EQUIPO' : 'BIENVENIDO DE VUELTA'}</p>
      <h2>{registering ? 'Tu cuenta, lista en un momento.' : 'Entra a tus espacios.'}</h2>
      <p className="subtle">{registering ? 'Solo necesitas tu nombre, correo y una contraseña. Sin códigos ni invitaciones.' : 'Usa la misma cuenta en tu celular y computador.'}</p>
    </div>
    <form id="event-access" autoComplete="off" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        await api('auth/' + mode, {name, email: email.trim(), password});
        location.reload();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      {registering && <label className="field"><span>Tu nombre</span><input id="access-name" name="display-name" required minLength={2} maxLength={100} autoComplete="off" placeholder="Cómo te conoce el equipo" value={name} onChange={e => setName(e.target.value)}/></label>}
      <label className="field"><span>Correo electrónico</span><input id="access-email" name="account-email" required type="email" inputMode="email" maxLength={254} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="tu@correo.cl" value={email} onChange={e => setEmail(e.target.value)}/></label>
      <div className="field">
        <label className="password-label" htmlFor="access-password">Contraseña</label>
        <div className="password-field">
          <input id="access-password" name="password" required type={showPassword ? 'text' : 'password'} minLength={registering ? 12 : 1} maxLength={200} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete={showPassword ? 'off' : registering ? 'new-password' : 'current-password'} aria-describedby={registering ? 'password-hint' : undefined} value={password} onChange={e => setPassword(e.target.value)}/>
          <button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-controls="access-password" title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}</button>
        </div>
        {registering && <p className="fine-print" id="password-hint">Al menos 12 caracteres. Puedes usar una frase fácil de recordar.</p>}
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? <><Loader2 size={18} className="spin"/>{registering ? 'Creando tu cuenta…' : 'Entrando…'}</> : <>{registering ? 'Crear cuenta y entrar' : 'Entrar'}<ArrowRight size={18}/></>}</button>
    </form>
    <div className="auth-context"><Users size={18}/><p>Las cuentas nuevas pueden consultar el evento. El administrador habilita la edición y la subida de fotos y videos.</p></div>
  </section>;
}

export function TeamAccess({user, team, pending, onChange}: {user: User; team: User[]; pending: number; onChange: () => Promise<void>}) {
  const [message, setMessage] = useState('');
  const link = location.origin + '/#register';
  return <>
    <p className="subtle">Conectado como {user.name} · {ROLE_LABELS[user.role]}</p>
    <div className="invite-result">
      <label className="field"><span>Enlace para sumar al equipo</span><input readOnly value={link} onFocus={e => e.target.select()}/></label>
      <p className="fine-print">Compártelo con los encargados. Cada uno crea su cuenta; un administrador le asigna permiso para registrar.</p>
      <button className="button secondary" onClick={async () => {
        try {await navigator.clipboard.writeText(link); setMessage('Enlace copiado.');}
        catch {setMessage('Selecciona y copia el enlace.');}
      }}><Copy size={16}/>Copiar enlace</button>
    </div>
    {user.role !== 'admin' && team.map(m => <div className="member-row" key={m.id}><span className="avatar">{m.name.slice(0, 1).toUpperCase()}</span><div><strong>{m.name}</strong><p>{ROLE_LABELS[m.role]} · {m.email}</p></div></div>)}
    {message && <p role="status" className="fine-print">{message}</p>}
    <button className="text-button spaced" disabled={pending > 0} onClick={async () => {
      try {await api('auth/logout', {}); localStorage.removeItem('orden-last-user'); location.hash = 'login'; location.reload();}
      catch (e) {setMessage((e as Error).message);}
    }}><LogOut size={16}/>Cerrar sesión</button>
    {pending > 0 && <p className="fine-print">Respalda los pendientes antes de cerrar sesión.</p>}
  </>;
}
