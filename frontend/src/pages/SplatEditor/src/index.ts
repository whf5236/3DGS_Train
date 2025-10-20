import './ui/scss/style.scss';
import { version as pcuiVersion, revision as pcuiRevision } from '@playcanvas/pcui';
import { version as engineVersion, revision as engineRevision } from 'playcanvas';

import { main } from './main';
const appVersion = __VERSION__ || '2.12.2';

// print out versions of dependent packages
// NOTE: add dummy style reference to prevent tree shaking
console.log(`SuperSplat v${appVersion} | PCUI v${pcuiVersion} (${pcuiRevision}) | Engine v${engineVersion} (${engineRevision})`);

main();
