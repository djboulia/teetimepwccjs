var MemberInfo = function (session) {


  this.do = function () {
    console.log("MemberInfo.do");

    return new Promise(function (resolve, reject) {
      session.get('api/v1/roster/getcurrentMember')
        .then(function (body) {

          var json = JSON.parse(body);

          // holds the results of current member info
          var info = {
            name: json.fullName.trim(),
            id : json.memberId
          };

          resolve(info);
        }, function (err) {
          reject(err);
        });
    });

  };

};

module.exports = MemberInfo;