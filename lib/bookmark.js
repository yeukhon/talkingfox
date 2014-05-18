const { Bookmark, save } = require("sdk/places/bookmarks");
const main = require("./main");
const tabs = require('sdk/tabs');

function explain() {
    main.panel.port.emit("play", "You can say bookmark this page to add " +
        "a page to the bookmark.");
};

function savenow() {
    var url = tabs.activeTab.url;
    var title = tabs.activeTab.title;
    let bookmark = Bookmark({title: title, url:url});
    save(bookmark);
    main.panel.port.emit("play",
        "Bookmark saved.");
};

exports.savenow = savenow;
exports.explain = explain;
