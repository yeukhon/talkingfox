const { Cu} = require("chrome");
const { Task } = Cu.import("resource://gre/modules/Task.jsm", {});
const tabs = require('sdk/tabs');
const main = require('./main');
const { search } = require('sdk/places/history');

function FSM(name) {
    this.initialize = function () {
        this.currentState = undefined;
        this.onHold = false;
        this.accepted = false;
        this.rejected = false;
    };
    this.initialize();

}; 
FSM.prototype.setToAccept = function () {
    this.accepted = true;
    this.onHold = false;
};
FSM.prototype.setToReject = function () {
    this.rejected = true;
    this.onHold = false;
};
FSM.prototype.setToHold = function () {
    this.onHold = true;
};
FSM.prototype.consume = function (input) {
    this.currentState(this, input);
};
FSM.prototype.moveTo = function (stateFn, options) {
    this.currentState = stateFn;
    if (options) {
        if (!options.deferred) {
            this.currentState(this, options.data);
        }
    }
};
FSM.prototype.emitToPanel = function (e, str) {
    main.panel.port.emit(e, str);  
};

FSM.prototype.emitToPage = function (e, str) {
    var w = main.pageWorker();
    w.port.emit(e, str);
};

var digitToNumber = {
    1: 'one',
    2: 'two',
    3: 'three'
};
/*
Building Goto FSM.
*/
function GotoFSM() {
    this._lock = false;
    this.SITE_LIST = {
        'ccny': 'https://ccny.cuny.edu',
        'google': 'https://google.com',
        'gmail': 'https://gmail.com',
        'youtube': 'https://youtube.com',
        'facebook': 'https://facebook.com',
        'yahoo': 'https://yahoo.com'
    }
    this._sites = [];
    // Utilities functions

    var searchHistory = function (target) {
        // Since result is returned asyn, put a lock before
        // jumping to conclusion in the caller's frame.
        this._lock = true;
        var emit = search({
            query: target
        }, {
            sort: 'visitCount',
            descending: true
        });
        emit.on("end", function (results) {
            console.log("at the end! let's free lock");
            this._lock = false;
            this.data = results;
            console.log(this.data);
        });
        return emit;
    };

    var readHistoryResult = function (emitEvent) {
       console.log(emitEvent);
        // while (this._lock) { console.log("not yet");}; // Oh! infinite loop :/
        console.log(emitEvent);
        var data = emitEvent.data;
        console.log(data);
        var outputs = [];
        // If there is data, we want to output three matches.
        // First match is the most visited but the homepage,
        // second match is the most visited in the history directly,
        // and the third match is the less visited in the history.
        if (this.data) {
            console.log("this" + this.data);
            return outputs;
        } else {
        };
    };    
    /*
    FSM transition functions:
       onStarting, onSelecting, onCorrecting, onAccepting, onRejecting
    
    Each transition function has a helper transition function to move:
       moveToSelecting, moveToCorrecting, moveToAccepting, moveToRejecting
    */

    var searchDB = function (self, target) {
        // First, search in the history.
        Task.spawn(function *() {
            var p = yield search({
                query: target
            }, {
                sort: "visitCount",
                descending: true
            });
            return {promise: p, target: target};
        }).then(function (p) {
            p.promise.on("end", function(r) {
                console.log(r);
                if (r.length > 0) {
                    self._sites = [];
                    var authority = r[0].url.split("/").slice(0,3).
                                    join("/");
                    self._sites.push({url: authority, title: p.target});
                    if (r[0].url != authority ||
                        r[0].url != authority+"/") {
                        self._sites.push(r[0]);
                    }
                    moveToSelecting(self);
                } else {
                    moveToRejecting(self, p.target);
                };
            });
        });
    };

    var onStarting = function (self, input) {
        var tokens = input.split(' ');
        var target = tokens[tokens.length - 1];
        console.log("target :" + target);
        if (target in self.SITE_LIST) {
            var site = {
                title: target,
                url: self.SITE_LIST[target]
            };
            moveToAccepting(self, site);
        
        } else {
            searchDB(self, target);
        }
    };
    
    var onSelecting = function (self, input) {
        // User's answer should specify the particular choice by
        // a number. If the number is not within range or
        // is not a number we consider as number, emit error
        // and hold the current state.
        var inTokens = function (tokens, candidates) {
            for (var i = 0; i < candidates.length; i++) {
                if (tokens.indexOf(candidates[i]) > - 1) {
                    return true;
                }
            }
            return false;
        };
        var site;
        var tokens = input.split(' ');
        if (inTokens(tokens, ['first', 'one', 'homepage', 'home page'])) {
            site = self._sites[0];
            return moveToAccepting(self, site);
        } else if (inTokens(tokens, ['second', 'two'])) {
            site = self._sites[1];
            return moveToAccepting(self, site);
        } else if (inTokens(tokens, ['no'])) {
            if (inTokens(tokens, ['goto'])) {
                var command = tokens.slice(
                    tokens.indexOf("goto")).join(" ");
                return moveToRestarting(self, command);
            } else {
                return moveToEnding(self);
            }
        } else {
            self.emitToPanel('invalid-input', [
                'You have',
                digitToNumber[self._sites.length],
                'options to choose from.',
                'For example you can say homepage or a number within range.'
            ].join(" "));
        }
    };

    var onAccepting = function (self, site) {
        self.setToAccept();
        self.emitToPanel('opening', [
            'Opening',
            site.title,
            'in a new tab.'
        ].join(' '));
        tabs.open(site.url);
    };
    var onRejecting = function (self, target) {
        var output = [
            'Sorry. Maybe it is the spelling',
            "but I can't locate any website called " +
            target,
            'in my memory. Maybe you can tell me the url instead?'
        ].join(' ');
        console.log("output " + output);
        self.emitToPanel("play", output);
        self.setToReject();
    };

    var moveTo = function (nextState, options) {
        this.currentState = nextState;
        if (options && !options.deferred) {
            nextState(options.self, options.data);
        };
    };
    var moveToSelecting = function (self) {
        self.setToHold();
        var output1 = 'Do you want to open the hompage of ' + self._sites[0].title;
        var output2 = '';
        if (self._sites.length > 1) {
            var output2 = ' or ' + self._sites[1].title;
        };
        self.emitToPanel('play', output1 + output2);
        self.moveTo(onSelecting);
    };

    var moveToRestarting = function (self, command) {
        console.log("move to restarting");
        self.initialize();
        self.currentState = onStarting;
        return self.consume(command);
    };

    var moveToAccepting = function (self, site) {
       self.setToAccept();
       self.emitToPanel("opening",
        ["Opening", site.title, "in a new tab."].join(" "));
       tabs.open(site.url);
    };

    var moveToEnding = function (self, target) {
        self.setToReject();
    };

    var moveToRejecting = function (self, target) {
        console.log("moving to rejecting state");
        self.moveTo(onRejecting, {
            deferred: false,
            data: target,
            self: self
        });
    };

    this.currentState = onStarting;
};

GotoFSM.prototype = new FSM;


function GmailFSM () {
    this.run = function (e) {
        this.emitToPage("run-gmail-command", e);
    };
    var onStarting = function (self, command) {
        if (command.indexOf("status") > -1) {
            moveToGettingNewEmailList(self);
            self.run("read-status");
        } else {
            console.log("gmail on starting: else");
            var tokens = command.split(" ");
            if ((tokens.indexOf("find") > -1 ||
                       tokens.indexOf("search") > -1) &&
                       tokens.indexOf("email")) {
                moveToFindEmail(self, command);
            }
        }
    };

    var moveToFindEmail = function (self, command) {
        self.currentState = onFindEmail;
        self.currentState(self, command);
    };

    var onFindEmail = function (self, command) {
        var locate = function (tokens, patterns) {
            var t;
            for (var i = 0; i < patterns.length; i++) {
                t = tokens.indexOf(patterns[i]);
                if (t > -1) {
                    return tokens[t+1];
                }
            }
            return -1;
        }
        var tokens = command.split(" ");
        var i, from, to , keyword, unread;

        from = locate(tokens, ["from", "by"]);
        keyword = locate(tokens, ["about", "title", "subject"]);
        unread = command.indexOf("new email");
        self.next = moveToReadEmailOrSelectingEmail;
        self.emitToPage("find-email",
            {unread:unread, from:from, to:to, keyword:keyword});
    };

    var moveToReadEmailOrSelectingEmail = function (self) {
        self.setToHold();
        self.currentState = onReadEmailOrSelectingEmail;
    };

    var onReadEmailOrSelectingEmail = function (self, command) {
        console.log("onReadEmailOrSelectingEmail");
        if (self._choices.length == 1 && command.indexOf("read")) {
            self._choice = self._choices[0];
            return moveToReadingEmailBody(self);
        } else if (self._choices.length > 1) {
            for (var i = 0; i < self._choices.length; i++) {
                if (self._choices[i].sender.indexOf(command)) {
                    self._choice = self._choices[i];
                    return moveToReadingEmailBody(self);
                };
            }
        };
    };

    var moveToGettingNewEmailList = function (self) {
        self.setToHold();
        self.currentState = onGettingNewEmailList;
        self.next = moveToReadingNewEmailsList;
    }

    var onGettingNewEmailList = function (self, command) {
        var tokens = command.split(" ");
        if (tokens.indexOf("yes") > -1) {
            self.run("get-new-emails-as-list");
        } else {
            self.setToReject();
        }
    };

    var moveToReadingNewEmailsList = function (self) {
        self.setToHold();
        self.currentState = onReadingNewEmailsList;
        self.currentState(self, "yes");
    };

    var inTokens = function (tokens, candidates) {
        for (var i = 0; i < candidates.length; i++) {
            if (tokens.indexOf(candidates[i]) > - 1) {
                return true;
            }
        }
        return false;
    };
    var ReadingNewEmailsListDecision = function (self, command) {
        var tokens = command.split(" ");
        if (tokens.indexOf("yes") > -1) {
            if (self._choices.length == 1) {
                self._choice = self._choices[0];
                moveToReadingEmailBody(self);
            } else {
                moveToWhichEmails(self);
            }
        } else if (inTokens(tokens, ["first", "one"])) {
            self._choice = self._choices[0];
            moveToReadingEmailBody(self);
        } else if (inTokens(tokens, ["second", "two"])) {
            self._choice = self._choices[1];
            moveToReadingEmailBody(self);
        } else if (inTokens(tokens, ["third", "three"])) {
            self._choice = self._choices[2];
            moveToReadingEmailBody(self);
        };
    };

    var onReadingNewEmailsList = function (self, command) {
        if (command === null || command == "yes") {
            self.emitToPage("read-new-emails-list", this._data);
            moveToSelection(self);
        }
    };

    var moveToSelection = function (self) {
        console.log("moving to selection");
        self.setToHold();
        self.currentState = onSelection;
    };

    var onSelection = function (self, command) {
        ReadingNewEmailsListDecision(self, command);
    };

    var moveToReadingEmailBody = function (self) {
        self.setToHold();
        self.currentState = onReadingEmailBody;
        self.currentState(self);
    };

    var onReadingEmailBody = function (self) {
        self.emitToPage("read-email-body", self._choice);
        self.setToAccept();
    };

    this.signal = function (e, data) {
        if (e == "set-to-accept") {
            this.setToAccept();
        } else if ( e == "set-to-continue") {
            console.log("set to continue has received");
            this._data = {emails: data, start: 0};
            this._choices = data.slice(0, 3);
            this.next(this);
        }
    };

    this.currentState = onStarting;

};

GmailFSM.prototype = new FSM;


exports.GotoFSM = GotoFSM;
exports.GmailFSM = GmailFSM;
exports.FSM = FSM;
