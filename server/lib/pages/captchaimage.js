/**
 * compare the input 
 */
var fs = require('fs');

var CaptchaImage = function (path, session) {

    /**
     * different types of catpcha images
     */
    const imageNames = ['bowling', 'cake', 'flag', 'hand', 'hotdog', 'pig'];

    /**
     * get the image from the server
     * 
     * @returns image contents from server
     */
    var getRemoteImage = function () {
        return session.get(path);
    }

    var findImageMatch = function (name, captchaImagePath, remoteImage) {
        let response = null;

        // there are nine possible catpcha images {name}-x.png where
        // x is a number from 1 through 9 
        // check our set of captcha images and compare
        for (let i = 1; i <= 9; i++) {
            const localImagePath = captchaImagePath + '/' + name + '-' + i + '.png';
            console.log("localImagePath : " + localImagePath);

            try {
                const localFile = fs.readFileSync(localImagePath);
                const localImage = localFile.toString()
    
                if (localImage === remoteImage) {
                    console.log('found a match: ' + i);
                    response = i;
                }    
            }
            catch( e ) {
                // console.log(e);
                console.log("couldn't find " + localImagePath);
            }

            // if we found a match, exit
            if (response != null) {
                break;
            }
        }

        return response;
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
            getRemoteImage()
                .then((imageData) => {
                    let response = null;

                    // search each of the catpcha images looking for a match
                    for (let i = 0; i < imageNames.length; i++) {
                        const name = imageNames[i];

                        response = findImageMatch(name, captchaImagePath, imageData);

                        if (response != null) {
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