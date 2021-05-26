var cheerio = require('cheerio');

var Captcha = function (body) {

    this.isCaptcha = function () {
        const $ = cheerio.load(body);
        // console.log("body: " + body);

        let result = false;

        // look for the header that says this is a captcha
        $('h2').each(function (i, h2) {
            const text = $(h2).text();
            // console.log('text: "' + text + '"');

            if (text === 'ForeTees BOT Checker') {
                result = true;
            }
        });

        return result;
    }

    this.getImageUrl = function () {
        const $ = cheerio.load(body);
        // console.log("body: " + body);

        let result = null;

        // look for the header that says this is a captcha
        $('p > img').each(function (i, img) {
            const src = $(img).attr('src');
            console.log('image src: "' + src + '"');
            result = src;
        });

        return result;
    }

}


module.exports = Captcha;