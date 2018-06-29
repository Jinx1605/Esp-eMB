var rfm;

SPI2.setup({
  mosi: B15,
  miso: B14,
  sck:  B13
});

function onInit() {
  rfm = require("RFM69").connect(SPI2, {
    cs:   B10,
    rst:  B1,
    freq: 915
  }, function() {
    rfm.rxmode(); // in order to receive data
    console.log("Connected");
    setInterval(function() { 
      if (rfm.hasPacket()) {
        console.log("Received : "+JSON.stringify(E.toString(rfm.getPacket())));
        rfm.sendPacket("Hello World");
      }
    },100);
  });
}

onInit();