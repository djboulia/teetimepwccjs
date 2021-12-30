var SessionConfig = require('./sessionconfig');
const config = new SessionConfig();

const username = config.getUserName();
const password = config.getPassword();
const session = config.getSession();

var CaptchaImage = require('../../server/lib/pages/captchaimage');

const URL  = '/v5/images/temp/tmp22T700C8.png';
const PATH_IMAGES = '../../images';

session.login(username, password)
    .then((result) => {
        console.log('result ', result);
        const ftSession = session.getFTSession();
        const rawSession = ftSession._getRawSession();

        const captchaImage = new CaptchaImage(URL, rawSession);

        captchaImage.getCaptchaNumber(PATH_IMAGES)
            .then((result) => {
                console.log('result: ' + result);
            })
            .catch((e) => {
                console.log('session result', rawSession.getLastResponse());
                console.log('caught error:');
                console.log(e);
            })
    })
    .catch((e) => {
        console.log(e);
    });


