import CxWorker from './cxworker.js';
import CxPair from './cxpair.js';

let ethUsdCxPair = new CxPair('eth', 'usd');

let cxEthUsd = new CxWorker(ethUsdCxPair,283,285,0.0001,console.log);