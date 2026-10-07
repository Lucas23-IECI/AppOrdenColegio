import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDump} from '../scripts/backup-data.js';
test('COPY parser keeps empty tables separate and decodes PostgreSQL text without executing SQL',()=>{
 const input='COPY public.oc_settings (key, value) FROM stdin;\n\\.\nCOPY public.oc_rooms (id, data) FROM stdin;\nx\t{"note":"line\\\\nnext","slash":"\\\\\\\\"}\n\\.\nCOPY auth.users (id, email) FROM stdin;\na\t\\N\n\\.\nSELECT dangerous();';
 const dump=readDump(input);assert.equal(dump.get('public.oc_settings')!.rows.length,0);assert.equal(dump.get('public.oc_rooms')!.rows.length,1);assert.equal(JSON.parse(dump.get('public.oc_rooms')!.rows[0][1]!).note,'line\nnext');assert.equal(dump.get('auth.users')!.rows[0][1],null);assert.equal(dump.size,3);
});
