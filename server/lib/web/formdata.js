//
// hold form elements to hand back to a form submission
// use the toObject() method to hand back something that 
// request.post will expect to see in the form attribute
//

var querystring = require('querystring');

var FormData = function () {
  var data = {};

  this.add = function (key, val) {
    data[key] = val;
  }

  this.toString = function () {
    return JSON.stringify(data);
  }

  this.toObject = function () {
    return data;
  }

  this.toQueryString = function() {
    return querystring.stringify(data);
  }

};

module.exports = FormData;