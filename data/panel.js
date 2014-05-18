/*var textArea = document.getElementById("edit-box");
textArea.addEventListener('keyup', function onkeyup(event) {
  if (event.keyCode == 13) {
    // Remove the newline.
    text = textArea.value.replace(/(\r\n|\n|\r)/gm,"");
    self.port.emit("text-entered", text);
    textArea.value = '';
  }
}, false);
*/
function play(output) {
    speak.play(output, {"noWorker": true});
};

var commandInput = document.getElementById("edit-box");
var commandSubmit = document.getElementById("submit-button");

commandSubmit.onclick = function(event) {
   console.log(commandInput.value);
   if (commandInput.value) {
        console.log("panel.js: submitted: " + commandInput.value);
        //speak.play(commandInput.value, {"noWorker": true});       
        self.postMessage(commandInput.value.toLowerCase());
    }
};
self.port.on("show", function onShow() {
  commandInput.focus();
});

self.port.on("submit", function () {
   
});

self.port.on("gmail", function(command) {
    doGmailCommand(command);
});

self.port.on("play", function(input) {
    console.log("playing : " + input);
    play(input);
});

self.port.on("unknown-command", function() {
    play("I don't understand the command.");
});

self.port.on("opening", function(input) {
    play(input);
});

self.port.on("invalid-input", function(input) {
    play("Sorry. I don't understand." + input);
});
