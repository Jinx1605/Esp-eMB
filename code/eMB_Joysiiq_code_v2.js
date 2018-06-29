

var rfm = require("RFM69");

SPI2.setup({mosi:B15,miso:B14,sck:B13});

var battery = {
  connection: "USB",
  init: function() {
    // Turn on the 'Bat' output fully
    digitalWrite(B0,0);
    // Partially turn on the 'Bat' output (this produces 3.3v on the FET,
    // meaning it has just 1.4v between Gate and Drain)
    digitalWrite(B0,1); 
    // turn off the output (also check if USB powered)
    digitalRead(B0);
    // get State
    battery.connection = digitalRead(B0) ? "Bat" : "USB";
    pinMode(B0, "af_opendrain");
    // output a 100Hz 50% duty cycle square wave
    analogWrite(B0, 0.5, {freq:100});
    setWatch(function() {
      battery.connection = digitalRead(B0) ? "Bat" : "USB";
    }, B0, {debounce:0, edge:"both", repeat:true});
  }
};

function onInit() {
  battery.init();
  rfm.connect(SPI2, {cs:B10, rst:B1, freq:915}, function() {
    console.log("Connected");
  });
}

setWatch(function() {
  digitalWrite(LED1,1);
  rfm.sendPacket("Hello World", function() {
    digitalWrite(LED1,0); // done sending
  });
}, BTN, {debounce:50, edge:"rising", repeat:true});

setTimeout(onInit,500);
//onInit();
