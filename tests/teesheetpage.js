var fs = require('fs');
var TeeSheet = require('../server/lib/pages/teesheet');

const body = fs.readFileSync('../examples/teesheetforetees.html');

const teeSheet = new TeeSheet(body);
const teetimes = teeSheet.getTeeTimes();

console.log('teetimes: ', teetimes);
