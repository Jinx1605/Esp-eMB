/*
  Setup Serial for GPS on
  Espruino Pico on Feather
  adaptor
*/ 
Serial1.setup(9600,{
  tx: B6,
  rx: B7
});

/*
  Setup Serial for GPS on
  Adafruit Huzzah32 Feather
*//*
Serial2.setup(9600, {
  tx: 17,
  rx: 16
});
*/

/*
  Setup SPI for rFM69 on
  Espruino Pico on Feather
  adaptor
*/ 
SPI1.setup({
  mosi: A7,
  miso: A6,
  sck:  A5
});

I2C2.setup({ // for OLED Screen
  scl:     B10,  // D1/GPIO5 on NodeMCU - 22 on Adafruit Huzzah32
  sda:     B3,  // D2/GPIO4 on NodeMCU - 23 on Adafruit Huzzah32,
  bitrate: 1000000 // go fast mode!!
});

var timeNow = "12:00:00 a",
    theDate;

var eGPS = {
  debug: false,
  hw: undefined,
  data: undefined,
  init: function () {
    eGPS.hw = require("eGPS").connect(Serial1, eGPS.update, {
      data: {
        time: {
          tzDiff: -4
        }
      }
    });
  },
  update: function(data) {
    eGPS.data = data;
    if (eGPS.data.time !== undefined)
      timeNow = eGPS.data.time.string;
    if (eGPS.data.dateTime !== undefined)
      theDate = eGPS.data.dateTime;
    if (eGPS.debug)
      console.log(eGPS.data);

  }
};

var oled;
var eOLED = {
  start: function () {
    oled.clear();
    oled.setFontBitmap();
    oled.setFontVector(40);
    oled.drawString("eMB v4.3",0,0);
    oled.flip();
    setTimeout(function(){
      setInterval(eOLED.update,250);
    },1000);
  },
  write: function(msg,size){
    size = (size === undefined) ? 24 : size;
    oled.clear();
    oled.setFontBitmap();
    oled.setFontVector(size);
    oled.drawString(msg,0,0);
    oled.flip();
  },
  update: function() {
    eOLED.write(timeNow,18);
  },
  init: function () {
    oled = require("SSD1306").connect(I2C2, eOLED.start, {
      height: 32,
      address: 0x3C // 0x3C default; 0x3D other
    });
  }
};



function onInit() {
  /* INIT GPS MODULE */
  eGPS.init();
  /*
  var rfm = require("RFM69").connect(SPI1, {
    cs: 33,
    rst:27,
    freq: 915
  }, function() {
    console.log('radio', "CONNECTED!");
    setInterval(function() { 
      var radiopacket = timeNow;
      console.log('radio : sending packet', radiopacket);
      rfm.sendPacket(radiopacket, function() {
        console.log('radio : sent packet', timeNow);
        //digitalWrite(LED1,0); // done sending
      });

      if (rfm.hasPacket()) 
        console.log("Received : "+JSON.stringify(E.toString(rfm.getPacket()))); 
    },100);
  });
  */
  
  /* INIT OLED SCREEN */
  eOLED.init();

  // setup sd card??
  // E.connectSDCard(SPI1, B1 /* CS? */);
}

onInit();