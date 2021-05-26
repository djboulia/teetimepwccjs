var fs = require('fs');
var Captcha = require('../server/lib/pages/captcha');

var body = fs.readFileSync('../examples/captcha.html');

var captcha = new Captcha(body);
var result = captcha.isCaptcha();

console.log('expecting true here');
console.log('result: ', (result) ? true : false);

if (result) {
    const imgsrc = captcha.getImageUrl();
    console.log(imgsrc);
}

body = fs.readFileSync('../examples/teesheetforetees.html');

captcha = new Captcha(body);
result = captcha.isCaptcha();

console.log('expecting false here');
console.log('result: ', (result) ? true : false);
