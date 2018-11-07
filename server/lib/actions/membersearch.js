var MemberSearch = function (session) {


  this.do = function (lastname) {
    console.log("MemberSearch.do");

    return new Promise(function (resolve, reject) {
      session.get('api/v1/roster/GetList/244')
        .then(function (body) {

          var json = JSON.parse(body);
          var rosterList = json.rosterList;

          if (rosterList) {
            var results = [];

            for (var i=0; i<rosterList.length; i++) {
              var member = rosterList[i];

              if (member.lastName.toLowerCase() == lastname.toLowerCase()) {
                var record = {
                  name: member.firstName + " " + member.lastName,
                  id : member.memberId
                }

                results.push(record);
              }
            }

            resolve(results);
          } else {
            reject("Invalid roster list!");
          }

        }, function (err) {
          reject(err);
        });
    });

  };

};

module.exports = MemberSearch;