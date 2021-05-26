//
// test getting a remote image via url and comparing it to local file based image
//
var Session = require('../server/lib/web/session');
var CaptchaImage = require('../server/lib/pages/captchaimage');

var site = 'prestonwood.com';
var url = 'getmedia/ccd1660b-838c-4c68-8f80-e1cb3dbbd651/Pwood_logo.aspx?width=885&height=885&ext=.png';

const session = new Session(site);
const captchaImage = new CaptchaImage(url, session);

const PATH_IMAGES = '../images';

captchaImage.getCaptchaNumber(PATH_IMAGES)
    .then((result) => {
        console.log('result: ' + result);
    })
    .catch((e) => {
        console.log('session HTTP status', session.getLastResponse().statusCode);
        console.log('session headers', session.getLastResponse().headers);
        console.log('caught error:');
        console.log(e);
    })
