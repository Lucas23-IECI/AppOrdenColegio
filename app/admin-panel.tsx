import {useCallback, useEffect, useState} from 'react';
import {ShieldCheck, Users, Search, RefreshCw, Loader2, UserCheck, UserX} from 'lucide-react';
import {api} from '../lib/http';
import {ROLE_LABELS, type TeamMember, type User} from '../lib/model';
import {LoadingSkeleton} from './loading-skeleton';

export function AdminPanel({user, onChange}: {user: User; onChange: () => Promise<void>}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draftRoles,setDraftRoles]=useState<Record<string,User['role']>>({});
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
      setDraftRoles(previous=>{const next={...previous};delete next[member.id];return next;});
      setMessage('Permisos de ' + member.name + ' actualizados.');
      if (member.id === user.id && (patch.disabled || patch.role !== undefined && patch.role !== 'admin')) {
        if (patch.disabled) {await api('auth/logout', {}); localStorage.removeItem('orden-last-user'); location.reload(); return;}
      } else await load();
      await onChange();
    } catch (e) {setError((e as Error).message);}
    finally {setBusy('');}
  }
  const visible = team.filter(m => (m.name + ' ' + m.email).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a,b)=>Number(!!b.primary_admin)-Number(!!a.primary_admin)||Number(a.disabled)-Number(b.disabled)||a.name.localeCompare(b.name,'es'));
  return <section className="panel admin-panel" aria-labelledby="admin-heading">
    <div className="panel-title"><div><p className="eyebrow">PERMISOS Y ACCESOS</p><h2 id="admin-heading"><ShieldCheck size={22}/>Administración del equipo</h2></div><button className="icon-button" aria-label="Actualizar equipo" disabled={loading || !!busy} onClick={() => void load()}><RefreshCw size={18} className={loading ? 'spin' : ''}/></button></div>
    <p className="subtle">Las cuentas nuevas solo pueden ver. Elige su permiso y pulsa Guardar.</p>
    <div className="role-guide"><div><strong>Administrador</strong><p>Edita salas, sube fotos y videos y administra el equipo.</p></div><div><strong>Solo lectura</strong><p>Consulta espacios, evidencias e informes. No modifica registros.</p></div></div>
    <details className="compact-tools"><summary>Otros permisos disponibles</summary><p className="fine-print">Coordinador: organiza y edita el evento, sin gestionar permisos. Encargado: registra espacios y edita sus propias evidencias.</p></details>
    <div className="admin-toolbar"><label className="search-field"><Search size={18}/><input aria-label="Buscar persona" placeholder="Buscar nombre o correo" value={search} onChange={e => setSearch(e.target.value)}/></label><span><Users size={16}/>{team.filter(m => !m.disabled).length} activos · {team.filter(m => m.disabled).length} desactivados</span></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="admin-message" role="status">{message}</p>}
    {loading && !team.length ? <LoadingSkeleton kind="team" label="Cargando equipo…"/> : visible.map(m => {
      const lastAdmin = m.role === 'admin' && !m.disabled && activeAdmins <= 1;
      const protectedAccount=m.primary_admin||lastAdmin;
      const selectedRole=draftRoles[m.id]??m.role;
      return <div className={'admin-member ' + (m.disabled ? 'disabled-member' : '')} key={m.id}>
        <span className="avatar">{m.name.slice(0,1).toUpperCase()}</span><div className="admin-person"><strong>{m.name}{m.id===user.id&&<span className="you-label">Tú</span>}</strong><p>{m.email}</p><small>{m.primary_admin?'Administrador principal':m.disabled?'Acceso desactivado':lastAdmin?'Último administrador activo':ROLE_LABELS[m.role]}</small></div>
        <div className="admin-permission"><label className="admin-role"><span>Qué puede hacer</span><select aria-label={'Rol de '+m.name} value={selectedRole} disabled={!!busy||loading||protectedAccount} onChange={e=>setDraftRoles(previous=>({...previous,[m.id]:e.target.value as User['role']}))}>{Object.entries(ROLE_LABELS).map(([role,label])=><option key={role} value={role}>{label}</option>)}</select></label><button className="button primary" aria-label={'Guardar permiso de '+m.name} disabled={!!busy||loading||protectedAccount||selectedRole===m.role} onClick={()=>void change(m,{role:selectedRole})}>Guardar permiso</button></div>
        {!m.primary_admin&&<button className="button secondary" disabled={!!busy||loading||lastAdmin} onClick={()=>void change(m,{disabled:!m.disabled})}>{busy===m.id?<Loader2 size={16} className="spin"/>:m.disabled?<UserCheck size={16}/>:<UserX size={16}/>} {m.disabled?'Reactivar':'Desactivar'}</button>}
      </div>;
    })}
    {!loading && !visible.length && <p className="empty-state">No hay personas con ese nombre o correo.</p>}
    <p className="fine-print">La cuenta principal siempre mantiene la administración. Desactivar otra cuenta conserva sus registros y bloquea su acceso.</p>
  </section>;
}
