const main = require("./main");
const preferences = require("sdk/preferences/service");

function firefox(input) {
    var SUPPORTED_SETTINGS = {
        "metric": "Shares performance, usage, hardware data with Mozilla.",
        "do-not-track":
            "Opt in or opt out of site tracking on sites that honors do not track.",
        "search": "Setting a default search engine" 
    };

    if (input.indexOf("explain") > -1) {
        main.panel.port.emit("play",
            "There are 3 options. metric, do not track and search." +
            " You can say firefox set metric to off or firefox set search"
            + " to Yahoo.");
    } else if (input.indexOf("metric") > -1) {
        var oldValue, newValue;
        oldValue = preferences.get("toolkit.telemetry.enabled");
        if (oldValue === true) {
            oldValue = "on";
        } else {
            oldValue = "off";
        };

        if (input.indexOf("off") > -1) {
            preferences.set("toolkit.telemetry.enabled", false);
            newValue = "off";
        } else {
            preferences.set("toolkit.telemetry.enabled", true);
            newValue = "on";
        }

        main.panel.port.emit("play",
            "Metric preference changed from " + oldValue + " to " + newValue);

    } else if (input.indexOf("do not track") > -1) {
        var oldValue, newValue;
        oldValue = preferences.get("privacy.donottrackheader.enabled");
        if (oldValue === true) {
            oldValue = "on";
        } else {
            oldValue = "off";
        };
        if (input.indexOf("on") > -1) {
            preferences.set("privacy.donottrackheader.enabled", true);
            preferences.set("privacy.donottrackheader.value", 1);
            newValue = "on";
        } else {
            preferences.set("privacy.donottrackheader.enabled", false);
            preferences.set("privacy.donottrackheader.value", 0);
            newValue = "off";
        }
        main.panel.port.emit("play",
            "Do not track  preference changed from " + oldValue + " to " + newValue);

    } else if (input.indexOf("search") > -1) {
        var oldValue, newValue;
        var tokens = input.split(" ");
        var engine = tokens[tokens.length-1];
        engine = engine.charAt(0).toUpperCase() + engine.slice(1);
        oldValue = preferences.get("browser.search.order.1");
        preferences.set("browser.search.defaultenginename", engine);
        preferences.set("browser.search.order.1", engine);
        main.panel.port.emit("play",
            "Search engine preference changed from " + oldValue +" to " + engine);
    }
};
exports.firefox = firefox;
