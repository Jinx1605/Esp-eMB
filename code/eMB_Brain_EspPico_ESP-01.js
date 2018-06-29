

Serial1.setup(9600, { // GPS
  tx: B6,
  rx: B7
});

Serial2.setup(115200, { // ESP-01
  rx: A3,
  tx: A2
});

digitalWrite(B9,1); // enable on Pico Shim V2

SPI2.setup({
  mosi: B15,
  miso: B14,
  sck:  B13
});

I2C2.setup({ // for OLED Screen
  scl:     B10,
  sda:     B3
});

function listFiles () {
  var files = require("fs").readdirSync();
  for (var i in files)
    console.log("Found file "+files[i]);
}

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  var f;
  if (a.pathname=="/") {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Index Page");
  } else if (a.pathname=="/hello") {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Hello World");
  } else if (E.openFile(a.pathname, "r") !== undefined) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    // streams the file to the HTTP response
    E.openFile(a.pathname, "r").pipe(res, {chunkSize:512});
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end("404: Page "+a.pathname+" not found");
  }
}

function extendDefaults(source, properties) {
   var property;
   for(property in properties) {
       if(properties.hasOwnProperty(property)) {
           source[property] = properties[property];
       }
   }
   return source;
}

function arr_diff (a1, a2) {
  var a = [], diff = [];
  for (var i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }
  for (var ir = 0; ir < a2.length; ir++) {
    if (a[a2[ir]]) {
      delete a[a2[ir]];
    } else {
      a[a2[ir]] = true;
    }
  }
  for (var k in a) {
    diff.push(k);
  }
  return diff;
}

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

var trustedClientsTbl = {
  "30:ae:a4:23:c7:e0" : {
    "name": "Adafruit Huzzah32",
    "role": "Test"
  }
};

var ap = {
  ssid: "eMB-AP",
  ip: "0.0.0.0",
  authMode: "wpa_wpa2_psk",
  password: "Jinx1605",
  channel: 11,
  clients: 0,
  port: 8080,
  socketPort: 1234,
  temp: {
    clientNum: 0,
    clients: []
  },
  wifi: undefined,
  init: function (conn) {
    ap.wifi = require('ESP8266WiFi_0v25').connect(conn, function (err) {
      if (err) throw err;
      ap.e.createAP();
    });
  },
  e: {
    createAP: function () {
      console.log('AP::Start - ' + ap.ssid);
      ap.wifi.createAP(ap.ssid, ap.password, ap.channel, ap.authMode, function (err) {
        if (err) throw err;
        ap.e.apCreated();
      }); 
    },
    apCreated: function () {
      ap.wifi.getIP(function (err, ip) {
        if (err) throw err;
        if (err === null) {
          ap.ip = ip;
          console.log('AP::Running', { ssid: ap.ssid, ip: ap.ip });
          // start html server
          require("http").createServer(onPageRequest).listen(ap.port);
          // start a websocket server now;
          require("net").createServer(function(c) {
            // A new client as connected
            c.write("Hello");
            c.on('data', function(data) {
              console.log(">"+JSON.stringify(data));
            });
            c.end();
          }).listen(ap.socketPort);
          console.log('AP::SocketServer', { ssid: ap.ssid, ip: ap.ip, port: ap.port, socket: ap.socketPort });
          // poll for clients...
          setInterval(ap.e.pollClients, 500);
        }
      });
    },
    pollClients: function () {
      ap.wifi.getConnectedDevices( function (err, devices) {
        if (err === null) {
          ap.clients = (!devices.length) ? [] : devices;
          if (ap.temp.clientNum != ap.clients.length) {
            // lower or higher??
            var dir = (ap.temp.clientNum < ap.clients.length) ? "Joined" : "Left";
            ap.temp.clientNum = ap.clients.length;
            
            if (ap.clients.length) {
              for (var i = 0; i < ap.clients.length; i++) {
                var macAd = ap.clients[i].mac;
                if (macAd in trustedClientsTbl) {
                  ap.clients[i] = extendDefaults( ap.clients[i], trustedClientsTbl[macAd] );
                }
              } // for
            } // if (ap.clients.length)
            // who joined or left
            
            var c = arr_diff(ap.temp.clients, ap.clients);
            ap.temp.clients = ap.clients;
            
            console.log('AP::Client ' + dir, { client: c[0].mac });
            console.log('AP::Clients', { clients: ap.clients });
            
          } // if (ap.temp.clients != ap.clients.length)
        } // if (err === null)
      });
    }
  }
};

function onInit() {
  // SD Card init
  E.connectSDCard(SPI2, B1);
  console.log(require("fs").readdirSync());
  
  ap.init(Serial2);
  
  /* INIT GPS MODULE */
  setTimeout(eGPS.init,250);
  //eGPS.init();

  
  //eOLED.init();
}

setTimeout(onInit,250);

/*
wifi.getConnectedDevices(function(err, devices) { console.log(err,devices); });
*/