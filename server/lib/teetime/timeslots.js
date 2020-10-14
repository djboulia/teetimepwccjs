var TimeSlot = require('./timeslot.js');

var TimeSlots = function () {
  // manage a list of time slots
  const slots = [];

  var validCourseName = function (name) {

    const courses = [
      "fairways",
      "meadows",
      "highlands"
    ];

    let result = false;

    for (var i = 0; i < courses.length; i++) {
      const course = courses[i];

      if (course.toLowerCase() === name.toLowerCase()) {
        result = true;
        break;
      }
    }

    return result;
  }

  var isSelectedCourse = function (courses, compare) {
    // return true if compare is in our list of courses
    let result = false;

    for (var i = 0; i < courses.length; i++) {
      const course = courses[i];

      if (course.toLowerCase() === compare.toLowerCase()) {
        result = true;
        break;
      }
    }

    return result;
  }

  var findCourseIndex = function (course, courses) {
    // return the index of course in the courses array

    for (var i = 0; i < courses.length; i++) {
      const item = courses[i];

      if (item.toLowerCase() === course.toLowerCase()) {
        return i;
      }
    }

    console.log("Warning, didn't find " + course + " in course list!");
    return -1;
  }

  this.add = function (teeTime, json, course, players) {

    const courseName = course.toLowerCase();

    if (!validCourseName(courseName)) {
      return null;
    }

    const slot = new TimeSlot(teeTime, json, course, players);

    slots.push(slot);

    return slot;
  }

  this.sortByCoursePreference = function (courses) {
    // order by time slot and course preference

    slots.sort(function (a, b) {
      const aTime = a.date.getTime();
      const bTime = b.date.getTime();

      if (aTime > bTime) {
        return 1;
      } else if (bTime > aTime) {
        return -1;
      } else {
        // times are equal, look at course preference
        const aIndex = findCourseIndex(a.course, courses);
        const bIndex = findCourseIndex(b.course, courses);

        if (aIndex > bIndex) {
          return 1;
        } else if (bIndex > aIndex) {
          return -1;
        }

        return 0;
      }
    });
  }

  this.toArray = function () {
    const results = [];

    for (var i = 0; i < slots.length; i++) {
      const slot = slots[i];

      results.push(slot.clone());
    }

    return results;
  }

  this.filter = function (date, courses) {
    // filter out by date and courses, removing 
    // entries that don't fit the criteria
    const result = new TimeSlots();

    for (var i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (slot.date.getTime() >= date.getTime()) {
        // time is equal to or later than our request, now see if it's the right course
        if (isSelectedCourse(courses, slot.course)) {
          // also a valid course, so keep it
          result.add(slot.date, slot.json, slot.course, slot.players);
        }
      }
    }

    result.sortByCoursePreference(courses);

    return result;
  }

};

module.exports = TimeSlots;