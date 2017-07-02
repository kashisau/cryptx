const CxWorker = require('./cxworker.js');
const CxPair = require('./cxpair.js');

let ethUsdCxPair = new CxPair('eth', 'usd');

let cxEthUsd = new CxWorker(ethUsdCxPair,283,285,0.0001,console.log);