var cheerio = require('cheerio');
var FormData = require('../web/formdata');

var TeeSheetLogin = function (path, session) {

  /**
   * grab info from the club SSO page which we 
   * then use to hand off to the tee time system site
   */
  var getClubSSOPage = function (path, clubSession) {

    return new Promise(function (resolve, reject) {
      clubSession.get(path)
        .then(function (body) {

          const $ = cheerio.load(body);
          // console.log("body: " + body);

          var parameters = {};
          parameters.viewState = $('input[id="__VIEWSTATE"]').val();
          parameters.viewStateGenerator = $('input[id="__VIEWSTATEGENERATOR"]').val();
          parameters.clubname = $('input[id="clubname"]').val();
          parameters.user_name = $('input[id="user_name"]').val();
          parameters.caller = $('input[id="caller"]').val();

          resolve(parameters);
        }, function (err) {
          reject(err);
        });

    });

  };

  /**
   * The member URL is given relative to our current path
   * (e.g. ../some/path/here), so handle translating it 
   * back to a path we can use directly with our get method
   */
  var buildRelativeUrl = function (path, base) {
    // URL object won't resolve a base that isn't absolute, so 
    // use a dummy site to build a full URL.  we strip it 
    // back to just the path before returning
    const DUMMY_SITE = "http://example.org";
    const baseUrl = new URL(base, DUMMY_SITE);
    const newUrl = new URL(path, baseUrl.toString());

    const newPath = newUrl.toString();
    return newPath.substr(DUMMY_SITE.length); // return just path portion
  };

  var loginTeeSheet = function (memberName, path, parameters) {

    return new Promise(function (resolve, reject) {

      // console.log("parameters: " + JSON.stringify(parameters));

      // load up our form data.  a bunch of these are fields from the
      // site login page that the server is expecting to see.  The 
      // relevant ones for us are the last three which hold the username/password
      var formdata = new FormData();

      formdata.add("manScript_HiddenField", "");
      formdata.add("__EVENTTARGET", "");
      formdata.add("__EVENTARGUMENT", "");
      formdata.add("__VIEWSTATE", parameters.viewState);
      formdata.add("lng", "en-US");
      formdata.add("__VIEWSTATEGENERATOR", parameters.viewStateGenerator);
      formdata.add("__SCROLLPOSITIONX", "0");
      formdata.add("__SCROLLPOSITIONY", "0");

      formdata.add("clubname", parameters.clubname);
      formdata.add("user_name", parameters.user_name);
      formdata.add("caller", parameters.caller);

      // console.log("form data: " + formdata.toString());

      // this is the SSO handoff from the club site to the tee sheet site
      session.postNoSSL(path, formdata.toObject())
        .then(function (body) {

          // now go back to the site, this time via SSL which should
          // establish our session with the tee time site
          session.post(path, formdata.toObject())
            .then(function (body) {
              // we don't get a lot of positive confirmation from
              // the results of the post, but if a successful login occurred, 
              // we should now have a cookie called JSESSIONID in our session
              const cookieVal = session.getCookieValue(path, 'JSESSIONID');

              console.log("Tee time system session id: " + cookieVal);

              const memberPath = selectMember(memberName, body);

              const newPath = buildRelativeUrl(memberPath, path);

              session.get(newPath)
                .then(function (body) {
                  const response = session.getLastResponse();
                  console.log("headers " + JSON.stringify(response.headers));
                  // console.log(body);

                  const loginInfo = {
                    clubname: parameters.clubname,
                    user_name: parameters.user_name,
                    caller: parameters.caller
                  };

                  resolve((cookieVal != null) ? loginInfo : null);

                }, function (err) {
                  reject(err);
                });

            });
        }, function (err) {
          reject(err);
        });

    });
  };

  /**
   * After login, we are presented with a page of members.  Select the right
   * member to complete the login 
   */
  var selectMember = function (memberName, body) {
    console.log("Select Member name: " + memberName);

    let path = null;

    const $ = cheerio.load(body);
    // console.log("body: " + body);

    $('a').each(function (i, elem) {
      const altText = $(this).attr('alt');
      console.log("alt text is: " + altText);

      if (altText === memberName) {
        path = $(this).attr('href');
        console.log("Found member name at path: " + path);
      }
    });

    return (path);
  };

  this.promise = function (clubTeeSheetPage, clubSession, memberName) {

    return new Promise(function (resolve, reject) {

      getClubSSOPage(clubTeeSheetPage, clubSession)
        .then(function (parameters) {
          return loginTeeSheet(memberName, path, parameters)
        })
        .then(function (result) {
          resolve(result);
        }, function (err) {
          reject(err);
        });

    });
  };

};

module.exports = TeeSheetLogin;