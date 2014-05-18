// This file contains event emitters and listeners to and from
// events called from main.js and fsm.js

function play(message) {
    self.port.emit("signal-panel-to-play", message);
};

function signal(e, data) {
    self.port.emit(e, data);
}

self.port.on("run-gmail-command", function (command) {
    if (command == "read-status") {
        getStatus();
    } else if (command == "get-new-emails-as-list") {
        getNewEmailsAsList();
    };
});

self.port.on("read-new-emails-list", function (data) {
    readNewEmailsAsList(data.emails, data.start);
});

self.port.on("read-email-body", function (data) {
    readEmailBody(data);
});

self.port.on("find-email", function (data) {
    findEmails(data);
});
