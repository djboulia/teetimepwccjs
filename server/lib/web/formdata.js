//
// hold form elements to hand back to a form submission
// use the toObject() method to hand back something that 
// request.post will expect to see in the form attribute
//

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

};

module.exports = FormData;