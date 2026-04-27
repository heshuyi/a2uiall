import { isValidServerToClientMessage } from '../a2ui/validate.js';

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`[selfcheck] FAIL: ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`[selfcheck] ok: ${name}`);
  }
}

assert('reject empty object', !isValidServerToClientMessage({}));
assert(
  'reject multiple keys',
  !isValidServerToClientMessage({ beginRendering: { surfaceId: 'x', root: 'root' }, surfaceUpdate: { surfaceId: 'x', components: [] } }),
);
assert('accept beginRendering', isValidServerToClientMessage({ beginRendering: { surfaceId: 'x', root: 'root' } }));
assert('accept surfaceUpdate', isValidServerToClientMessage({ surfaceUpdate: { surfaceId: 'x', components: [{ id: 'root', component: { Card: { child: 'c' } } }] } }));
assert('accept dataModelUpdate', isValidServerToClientMessage({ dataModelUpdate: { surfaceId: 'x', contents: [{ key: 'a', valueString: 'b' }] } }));
assert('accept deleteSurface', isValidServerToClientMessage({ deleteSurface: { surfaceId: 'x' } }));

if (!process.exitCode) console.log('[selfcheck] all good');

