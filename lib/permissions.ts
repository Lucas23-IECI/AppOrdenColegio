import type {User} from './model';
export const canWrite=(user:User|null|undefined)=>!!user&&user.role!=='viewer';
export const canCoordinate=(user:User|null|undefined)=>!!user&&(user.role==='admin'||user.role==='coordinator');
