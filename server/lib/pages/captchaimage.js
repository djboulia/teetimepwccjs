/**
 * compare the input 
 */
 var fs = require('fs');

 var CaptchaImage = function (path, session) {
 
     var getImage = function () {
         return session.get(path);
     }
 
     /**
      * retrieve the remote image, then compare the contents 
      * of a remote image with our captcha images
      * will return a number from 1-9 or null or reject if not found
      * 
      * @returns the number of the captcha found (1-9) on success
      */
     this.getCaptchaNumber = function (captchaImagePath) {
        return new Promise(function (resolve, reject) {
            getImage()
            .then((body) => {
                let response = null;

                // there are nine possible catpcha images hand-x.png where
                // x is a number from 1 through 9 
                // check our set of captcha images and compare
                for (let i=1; i<=9; i++) {
                    const localImagePath = captchaImagePath + '/hand-' + i + '.png';
                    console.log("localImagePath : " + localImagePath);

                    const localFile = fs.readFileSync(localImagePath);
                    const localString = localFile.toString()

                    if (localString === body) {
                        console.log('found a match: ' + i);
                        response = i;
                        break;
                    }
                }

                if (response != null) {
                    resolve(response);
                } else {
                    reject(new Error('did not find a captcha match!'));
                }
            })
            .catch((e) => {
                reject(e);
            })
          });
     }
 
 }
 
 
 module.exports = CaptchaImage;