import {useCallback, useEffect, useState} from 'react';
import {ShieldCheck, Users, Search, RefreshCw, Loader2, UserCheck, UserX} from 'lucide-react';
import {api} from '../lib/http';
import {ROLE_LABELS, type TeamMember, type User} from '../lib/model';

export function AdminPanel({user, onChange}: {user: User; onChange: () => Promise<void>}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {const result = await api<{team: TeamMember[]}>('auth/team'); setTeam(result.team); setError('');}
    catch (e) {setError((e as Error).message);}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {void load();}, [load]);
  const activeAdmins = team.filter(m => m.role === 'admin' && !m.disabled).length;
  async function change(member: TeamMember, patch: {role?: User['role']; disabled?: boolean}) {
    if (patch.disabled && !confirm('¿Desactivar el acceso de ' + member.name + '? Sus registros se conservarán.')) return;
    if (member.id === user.id && patch.role && patch.role !== 'admin' && !confirm('Vas a dejar de administrar el equipo. Otro administrador tendrá que devolverte ese permiso. ¿Continuar?')) return;
    setBusy(member.id); setError(''); setMessage('');
    try {
      await api('auth/member', {userId: member.id, ...patch});
      setMessage('Permisos de ' + member.name + ' actualizados.');
      if (member.id === user.id && (patch.disabled || patch.role !== undefined && patch.role !== 'admin')) {
        if (patch.disabled) {await api('auth/logout', {}); localStorage.removeItem('orden-last-user'); location.reload(); return;}
      } else await load();
      await onChange();
    } catch (e) {setError((e as Error).message);}
    finally {setBusy('');}
  }
  const visible = team.filter(m => (m.name + ' ' + m.email).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name, 'es'));
  return <section className="panel admin-panel" aria-labelledby="admin-heading">
    <div className="panel-title"><div><p className="eyebrow">PERMISOS Y ACCESOS</p><h2 id="admin-heading"><ShieldCheck size={22}/>Administración del equipo</h2></div><button className="icon-button" aria-label="Actualizar equipo" disabled={loading || !!busy} onClick={() => void load()}><RefreshCw size={18} className={loading ? 'spin' : ''}/></button></div>
    <p className="subtle">Decide qué puede hacer cada persona. Las cuentas nuevas entran como encargados.</p>
    <div className="role-guide"><div><strong>Administrador</strong><p>Gestiona permisos, accesos, evento y registros.</p></div><div><strong>Coordinador</strong><p>Organiza el evento, archiva espacios y revisa evidencias.</p></div><div><strong>Encargado</strong><p>Registra espacios, fotos, videos y genera informes.</p></div></div>
    <div className="admin-toolbar"><label className="search-field"><Search size={18}/><input aria-label="Buscar persona" placeholder="Buscar nombre o correo" value={search} onChange={e => setSearch(e.target.value)}/></label><span><Users size={16}/>{team.filter(m => !m.disabled).length} activos · {team.filter(m => m.disabled).length} desactivados</span></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="admin-message" role="status">{message}</p>}
    {loading && !team.length ? <p className="loading-state"><Loader2 className="spin"/>Cargando equipo…</p> : visible.map(m => {
      const lastAdmin = m.role === 'admin' && !m.disabled && activeAdmins <= 1;
      return <div className={'admin-member ' + (m.disabled ? 'disabled-member' : '')} key={m.id}>
        <span className="avatar">{m.name.slice(0, 1).toUpperCase()}</span><div className="admin-person"><strong>{m.name}{m.id === user.id && <span className="you-label">Tú</span>}</strong><p>{m.email}</p><small>{m.disabled ? 'Acceso desactivado' : lastAdmin ? 'Último administrador activo' : ROLE_LABELS[m.role]}</small></div>
        <label className="admin-role"><span>Rol</span><select aria-label={'Rol de ' + m.name} value={m.role} disabled={!!busy || loading || lastAdmin} onChange={e => void change(m, {role: e.target.value as User['role']})}>{Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
        <button className="button secondary" disabled={!!busy || loading || lastAdmin} onClick={() => void change(m, {disabled: !m.disabled})}>{busy === m.id ? <Loader2 size={16} className="spin"/> : m.disabled ? <UserCheck size={16}/> : <UserX size={16}/>} {m.disabled ? 'Reactivar' : 'Desactivar'}</button>
      </div>;
    })}
    {!loading && !visible.length && <p className="empty-state">No hay personas con ese nombre o correo.</p>}
    <p className="fine-print">Desactivar conserva los registros y bloquea el acceso al servidor. Debe quedar al menos un administrador activo.</p>
  </section>;
}
