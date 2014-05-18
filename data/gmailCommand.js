function getStatus() {
    console.log("getting gmail status");
    var gmail = Gmail();
    var unreadStat = gmail.get.unread_emails();
    console.log(unreadStat);
    if (unreadStat.inbox > 0) {
        play("There are " + unreadStat.inbox + " new emails in your inbox. " +
             "Do you want me to list them for you?");
    } else {
        play("There are no new emails since your last visit.");
        signal("set-to-accept");
    }
};

function getNewEmailsAsList () {
    var gmail = Gmail();
    var oldUrl = window.location.href;
    var newUrl = "https://mail.google.com/mail/u/0/#search/is%3Aunread" +
                 "+in%3Ainbox+-category%3Apromotions+-category%3Asocial";
    window.location.href = newUrl;
    gmail = Gmail();
    var emails = gmail.get.visible_emails();
    window.location.href = oldUrl;
    console.log(emails);
    signal("set-to-continue", emails);
};

function readNewEmailsAsList (emails, start) {
    if (start + 2 <= emails.length-1) {
        var end = start + 2;
    } else {
        var end = emails.length-1;
    };

    console.log(emails);
    var report = [];
    var gmail = Gmail();
    for (var i = start; i <= end; i++) {
        var data = gmail.get.email_data(emails[i].id);
        report.push(data.subject + " from " + data.threads[data.last_email].from);
    }

    console.log(report);
    counter = {
        0: "First email. ",
        1: "Second email. ",
        2: "Third email. "
    };

    var body = "";
    if (report.length == 1) {
        play("Okay. You have an email called " + report[0] +
             " Now do you want me to read this email to you?");
    } else {
        for (var i = 0; i < report.length; i++) {
            body = body + counter[i] + " " + report[i];
        }
        body += ". Do you want me to list more emails or read one of them to you?";
        play(body);
    }
};

function readEmailBody (email) {
    console.log("readEmailBody");
    var gmail = Gmail();
    var url = "https://mail.google.com/mail/u/0/#inbox/" + email.id;
    var oldUrl = window.location.href;
    window.location.href = url;
    var data = gmail.get.email_data(email.id);
    console.log(data);
    var from = data.threads[data.last_email].from;
    var time = data.threads[data.last_email].datetime;
    var body = data.threads[data.last_email].content_plain;
    play("On " + time + " " + from + " " + "said  " + body);
};

function findEmails (data) {
    console.log("inside findEmails");
    console.log(data);
    var url = "https://mail.google.com/mail/u/0/#search/in%3Ainbox";
    if (data.from){
        url = url + "+from%3A" + data.from;
    }
    if (data.to) {
        url = url + "+to%3A" + data.to;
    }
    if (data.keyword) {
        url = url + "+" + data.keyword;
    }

    if (data.unread) {
        url = url + "+is%3Aunread";
    }

    console.log(url);
    window.location.href = url;
    var gmail = Gmail();
    var emails = gmail.get.visible_emails();
    if (emails.length > 0) {
        if (emails.length == 1) {
            var d = gmail.get.email_data(emails[0].id);
            var sender = d.threads[d.last_email].from;
            var title = d.subject;
            play("There is one match. The email is " + title + " from " + sender);
        } else {
            var names = [];
            for (var i = 0; i < emails.length; i++) {
                var d = gmail.get.email_data(emails[0].id);
                var n = d.threads[d.last_email].from;
                emails[i].sender = n;
                names.push(n);
            }

            play("There are " + emails.length + " matches from " +
                 names + ". Which one are you looking for?");
        }
        signal("set-to-continue", emails);
    }
};
