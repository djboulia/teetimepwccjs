var SessionConfig = require('./sessionconfig');
const config = new SessionConfig();

const username = config.getUserName();
const password = config.getPassword();
const session = config.getSession();

session.login(username, password)
    .then((result) => {
        console.log('result ', result);
    })
    .catch((e) => {
        console.log(e);
    });


