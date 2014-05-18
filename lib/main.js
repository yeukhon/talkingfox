var data = require("sdk/self").data;
var panel = require("sdk/panel");
var tabs = require("sdk/tabs");
var { Hotkey } = require("sdk/hotkeys");
var GotoFSM = require("./fsm").GotoFSM;
var GmailFSM = require("./fsm").GmailFSM;
var firefox = require("./firefox");
var bookmark = require("./bookmark");
var fsm = undefined;

function handleInput(input) {
    console.log(fsm);
    if (fsm === undefined ||
        fsm && (
             !fsm.onHold ||
             fsm.accepted     ||
             fsm.rejected      )) {
        console.log("handleInput: in the if clause");
        //var cmdType = determineCommand(input);
        //fsm = FSM.create(cmdType);
        console.log("handle " + input);
        if (input.indexOf("goto") > -1) {
            console.log("goto if clause");
            fsm = new GotoFSM();
            fsm.consume(input);
        } else if (input.indexOf("gmail ") > -1) {
            fsm = new GmailFSM();
            fsm.consume(input);
        } else if (input.indexOf("firefox ") > -1) {
            firefox.firefox(input);
        } else if (input.indexOf("bookmark ") > -1) {
            if (input.indexOf("explain") > -1) {
                bookmark.explain();
            } else {
                bookmark.savenow();
            }
        } else {
            text_entry.port.emit("invalid-input", input);
        };
    } else {
        console.log("handleInput: in the else clause");
        fsm.consume(input);
    }
};

/*
function attachScript() {
    return tabs.activeTab.attach({
        contentScriptFile: [
            data.url("speakGenerator.js"),
            data.url("speakClient.js"),
            data.url("jquery.js"),
            data.url("gmail.js"),
            data.url('script.js'),
            data.url('gmailCommand.js'),
//            data.url('panel.js'),
        ]
    });
};

var worker = attachScript();

tabs.on('activate', function(tab) {
    worker = attachScript();
});
*/
var text_entry = panel.Panel({
  contentURL: data.url("panel.html"),
  contentScriptFile: [
    data.url("speakGenerator.js"),
    data.url("speakClient.js"),
    data.url("panel.js"),
  ],
  width: 260,
  height: 50,
  position: {top: 20, bottom: 100, right: 100},
  onMessage: function(command) {
    handleInput(command);
  }
});

/*
var pageMod = require("sdk/page-mod").PageMod({
    include: "*",
    contentScriptWhen: "end",
    contentScriptFile: [
        data.url("speakGenerator.js"),
        data.url("speakClient.js"),
        data.url("script.js")
    ]
});
*/

require("sdk/ui/button/action").ActionButton({
  id: "show-panel",
  label: "Show Panel",
  icon: {
      "16": "./on.png",
      "32": "./on.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  text_entry.show();
}

text_entry.on("show", function() {
  text_entry.port.emit("show");
});

text_entry.port.on("text-entered", function (text) {
  console.log(text);
  text_entry.hide();
});

function attachScript() {
    return tabs.activeTab.attach({
        contentScriptFile: [
            data.url("jquery.js"),
            data.url("gmail.js"),
            data.url("gmailCommand.js"),
            data.url("signalMain.js")
        ]
    });
};

var worker = attachScript();
/*
tabs.on('activate', function(tab) {
    console.log("switched to a new tab, now attach script");
    worker = attachScript();
    worker.port.on("signal-panel-to-play", function (message) {
        text_entry.port.emit("play", message);
    });
});
*/

tabs.on('activate', function (tab) {
    worker = tab.attach({
        contentScriptFile: [
            data.url("jquery.js"),
            data.url("gmail.js"),
            data.url("gmailCommand.js"),
            data.url("signalMain.js")
        ]
    });
    worker.port.on("signal-panel-to-play", function (message) {
        text_entry.port.emit("play", message);
    });
    worker.port.on("set-to-accept", function () {
        console.log("received accept signal");
        fsm.signal("set-to-accept");
    });
    worker.port.on("set-to-hold", function () {
        fsm.signal("set-to-hold");
    });
    worker.port.on("set-to-continue", function (data) {
        console.log("received continue signal");
        fsm.signal("set-to-continue", data);
    });
});

function getWorker () {
tabs.on('activate', function (tab) {
    worker = tab.attach({
        contentScriptFile: [
            data.url("jquery.js"),
            data.url("gmail.js"),
            data.url("signalMain.js")
        ]
    });
    worker.port.on("signal-panel-to-play", function (message) {
        text_entry.port.emit("play", message);
    });
    worker.port.on("set-to-accept", function () {
        console.log("received accept signal");
        fsm.signal("set-to-accept");
    });
    worker.port.on("set-to-hold", function () {
        fsm.signal("set-to-hold");
    });
    worker.port.on("set-to-continue", function (data) {
        console.log("received continue signal");
        fsm.signal("set-to-continue", data);
    });
});
    return worker;
};
var showPanelHotKey = Hotkey({
    combo: "meta-shift-x",
    onPress: function () {
        text_entry.show();    
    }
});

exports.panel = text_entry;
exports.pageWorker = getWorker;
