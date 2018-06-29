/* Copyright (c) 2013 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */
/*
Module for interfacing with serial (NMEA) GPS devices

```
Serial4.setup(9600,{tx:C10,rx:C11});
var gps = connect(Serial4, function(data) {
  console.log(data);
});
```
*/
function handleGPSLine(line, gObj, callback) {
  var tag = line.substr(3,3),
      g = line.split(","),
      d = gObj.data,
      glat, glon;

  d.fix = 0;

  // console.log('hndlegpsline:line data;', g);
  switch (tag) {
    case "GLL":
      //console.log('handleGPSLine', { tag: tag, data: g});
      glat = g[1].indexOf(".");
      glon = g[3].indexOf(".");
      //d.lat = parseCoord(g[2],g[3]);
      d.lat = (parseInt(g[1].substr(0,glat-2),10)+parseFloat(g[1].substr(glat-2))/60)*(g[2]=="S"?-1:1);
      d.lon = (parseInt(g[3].substr(0,glon-2),10)+parseFloat(g[3].substr(glon-2))/60)*(g[4]=="W"?-1:1);
      //d.time = parseTime(g[5],-4);
      break;
    case "RMC": // minimum specific GPS/Transit data
      //console.log('handleGPSLine', { tag: tag, data: g});
      glat = g[3].indexOf(".");
      glon = g[5].indexOf(".");
      d.time = parseTime(g[1],-4);
      //d.lat = parseCoord(g[2],g[3]);
      //d.lat = (parseInt(g[3].substr(0,glat-2),10)+parseFloat(g[3].substr(glat-2))/60)*(g[4]=="S"?-1:1);
      //d.lon = (parseInt(g[5].substr(0,glon-2),10)+parseFloat(g[5].substr(glon-2))/60)*(g[6]=="W"?-1:1);
      d.date = parseDate(g[9]);
      d.speed  = parseSpeed(g[7]);
      d.angle  = parseInt(g[8],10);
      d.dateTime = new Date(d.date.year, (d.date.month-1), d.date.day, d.time.rHtz, d.time.minutes, d.time.seconds);
      break;
    case "VTG": // track made good and ground speed
      // console.log('handleGPSLine', { tag: tag, data: g});
      d.speed  = parseSpeed(g[5], g[7]);
      break;
    case "GGA": // GPS Fix Data
      //console.log('handleGPSLine', { tag: tag, data: g});
      glat = g[2].indexOf(".");
      glon = g[4].indexOf(".");
      d.time = parseTime(g[1],-4);
      d.fix = parseInt(g[6],10);

      //d.lat = parseCoord(g[2],g[3]);
      d.lat = (parseInt(g[2].substr(0,glat-2),10)+parseFloat(g[2].substr(glat-2))/60)*(g[3]=="S"?-1:1);
      d.lon = (parseInt(g[4].substr(0,glon-2),10)+parseFloat(g[4].substr(glon-2))/60)*(g[5]=="W"?-1:1);

      d.satellites = parseInt(g[7],10);
      d.altitude = parseFloat(g[9]);
      break;
    case "GSA": // DOP and active satellites
      // console.log('handleGPSLine', { tag: tag, data: g});
      break;
    case "GSV": // satellites in view
      break;
    default:

  }

  callback(d);

}

var p = {
  line:"",
  tag:"",
  arr:[],
  obj:{},
  data:{},
  process: function(line, obj, callback) {
    this.line = line.replace("\r","");
    this.tag = this.line.substr(3,3);
    this.arr = this.line.split(',');
    // remove tag since we know it;
    var r = this.arr.splice(0,1);
    this.obj = obj;
    this.data = this.obj.data;
    //console.log('p::process', { /*line: line,*/ tag: this.tag, arr: this.arr });

    if (this.handler.hasOwnProperty(this.tag)) {
      // PROCESS THE LINE IF THERE IS A HANDLER FOR IT
      this.handler[this.tag](this.line,this.tag, this.arr);
    }

    // EXTEND DATA WITH NEWLY PARSED DATA
    this.obj.data = extendDefaults(this.obj.data, this.data);
    // console.log('process::hasTag', { tag: this.tag, hasHandler: hasHandler });

    // INIT CALLBACK WITH NEW DATA
    callback(this.obj.data);
  },
  handler: {
    GGA: function(l,t,a) {
      //console.log('p::handling', { tag: t, arr: a, line: l});
      p.data.time = p.parse.time(a[0]);
      p.data.fix = p.parse.fix(a[5]);
      if (p.data.fix) {
        p.data.lat = p.parse.coord(a[1],a[2]);
        p.data.lon = p.parse.coord(a[3],a[4]);
        if (p.data.lat.whole &&  p.data.lon.whole) {
          p.data.lastPos = p.data.lat.deg + ", " + p.data.lon.deg;
        }
      }
      p.data.satellites = p.parse.satellites(a[6]);
    },
    RMC: function(l, t, a) {
      //console.log('p::handling', { tag: t, fix: p.data.fix, arr: a, line: l});
      p.data.time = p.parse.time(a[0]);
      // p.data.fix = p.parse.fix(a[5]);
      if (p.data.fix) {
        p.data.lat = p.parse.coord(a[2],a[3]);
        p.data.lon = p.parse.coord(a[4],a[5]);
        if (p.data.lat.whole &&  p.data.lon.whole) {
          p.data.lastPos = p.data.lat.deg + ", " + p.data.lon.deg;
        }
        p.data.speed = p.parse.speed(a[6]);
        p.data.date = p.parse.date(a[8]);
      }
      if (p.data.date !== undefined) {
        p.data.dateTime = new Date(p.data.date.year, p.data.date.month-1, p.data.date.day, p.data.time.rHtz, p.data.time.minutes, p.data.time.seconds);
      }
    },
    GLL: function(l, t, a) {
      p.data.time = p.parse.time(a[4]);
    },
    VTG: function(l, t, a) {
      if (p.data.fix) {
        p.data.speed = p.parse.speed(a[4],a[6]);
      }
    },
    GSA: function(l, t, a) {
      p.data.fix = p.parse.gsaFix(a[1]);
    },
    GSV: function(l, t, a) {
      if (p.data.satellites) {
        p.data.satellites = p.parse.satellites(undefined,a[2]);
      }
    }
  },
  parse: {
    fix: function(str){ return (parseInt(str,10)) ? parseInt(str,10) : 0; },
    gsaFix: function(str){ return (parseInt(str,10) !== 1) ? parseInt(str,10) : 0; },
    time: function (str) {
      //console.log('process::time', { string: str });
      var hour, minute, second, ampm, timeString = "", rHtz;
      var tzDiff = (p.data.time.tzDiff !== undefined) ? p.data.time.tzDiff : 0;
      rHtz = parseInt(str.substr(0,2),10) + tzDiff;
      hour = rHtz;
      ampm = (hour > 12) ? "p" : "a" ;
      hour = (hour > 12) ? hour - 12 : hour ;
      hour = (hour === 0) ? 12 : hour;
      if (hour < 0) { hour = hour + 12; ampm = "p"; }
      timeString += (hour < 10) ? "0" + hour : hour;

      timeString += ":" + str.substr(2,2);
      minute = parseInt(str.substr(2,2),10);

      timeString += ":" + str.substr(4,2);
      second = parseInt(str.substr(4,2),10);

      timeString += " " + ampm;

      return {
        raw:str,
        rHtz: rHtz,
        hours:hour,
        minutes:minute,
        seconds: second,
        ampm: ampm,
        tzDiff: tzDiff,
        string: timeString
      };

    },
    date: function (gD) {
      var month, day, year;
      if (gD !== undefined) {
        day   = parseInt(gD.substr(0,2),10);
        month = parseInt(gD.substr(2,2),10);
        year  = 2000 + parseInt(gD.substr(4,2),10);
        // theDate = new Date(year, month, day, rHtz, minute, second);
      }
      return {
        raw:    gD,
        day:    day,
        month:  month,
        year:   year,
        string: month + "-" + day + "-" + year,
        short:  ((month < 10) ? "0" + month : month) + "-" + ((day < 10) ? "0" + day : day) + "-" + (year - 2000)
      };
    },
    speed: function (gS, kmh) {
      if (parseFloat(gS) === NaN) { gS = 0; }
      return {
        knots: parseFloat(gS) * 1,
        kmh:   (kmh !== undefined) ? parseFloat(kmh) : parseFloat(gS) * 1.852,
        mph:   parseFloat(gS) * 1.15078,
        raw:   gS
      };
    },
    altitude: function () {},
    satellites: function (sC,sV) {
      return {
        connected: (sC !== undefined) ? parseInt(sC,10): p.data.satellites.connected,
        visible: (parseInt(sV,10) !== NaN) ? parseInt(sV,10) : p.data.satellites.visible
      };
    },
    coord: function(lC, cD) {
      var whl = Math.floor(lC/100),
          dec = (lC - (100 * whl)) / 60,
          deg = whl + dec,
          ret;
          deg = (cD === "S" || cD === "W") ? -(deg) : deg;

      ret = {
        whole: whl,
        dec: dec,
        deg: deg,
        dir: cD,
        raw: lC + cD
      };
      /*
      console.log('parseCoord', ret);
      */
      return ret;
    }
  }
};

function extendDefaults(source, properties) {
   var property;
   for(property in properties) {
       if(properties.hasOwnProperty(property)) {
           source[property] = properties[property];
       }
   }
   return source;
}

// Compute the MTK checksum and display it
function updateChecksum(cmd) {
  // Compute the checksum by XORing all the character values in the string.
  var checksum = 0, hexsum;
  for(var i = 0; i < cmd.length; i++) {
    checksum = checksum ^ cmd.charCodeAt(i);
  }
  // Convert it to hexadecimal (base-16, upper case, most significant nybble first).
  hexsum = Number(checksum).toString(16).toUpperCase();
  if (hexsum.length < 2) {
    hexsum = ("00" + hexsum).slice(-2);
  }
  return "$" + cmd + "*" + hexsum;
}

var gpsNMEAOutput = [ // these are in order for the GPS. Dont mess with the order
  { tag: "GLL", enabled: 1, description: "Geographic Position - Latitude longitude" },
  { tag: "RMC", enabled: 1, description: "Recommended Minimum Specific GNSS Sentence" },
  { tag: "VTG", enabled: 1, description: "Course Over Ground and Ground Speed" },
  { tag: "GGA", enabled: 1, description: "GPS Fix Data" },
  { tag: "GSA", enabled: 1, description: "GNSS DOPS and Active Satellites" },
  { tag: "GSV", enabled: 1, description: "GNSS Satellites in View" },
  { tag: "GRS", enabled: 0, description: "GNSS Range Residuals" },
  { tag: "GST", enabled: 0, description: "GNSS Pseudorange Errors Statistics" },
  { tag: "ALM", enabled: 0, description: "GPS almanac information" },
  { tag: "EPH", enabled: 0, description: "GPS ephmeris information" },
  { tag: "DGP", enabled: 0, description: "GPS differential correction information" },
  { tag: "DBG", enabled: 0, description: "MTK debug information" },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " },
  { tag: "", enabled: 0, description: " " }
];

function getNMEAOutput() {
  var line = "PMTK314,", item, len = gpsNMEAOutput.length;
  for(var i = 0; i < len; i++) {
    line += "" + gpsNMEAOutput[i].enabled;
    if (i < len-1) {
      line += ",";
    }
  }
  return updateChecksum(line);
}

//
var settings = {
  nmea_output: getNMEAOutput(),
  nmea_update_rate: {
    "100mhz": "$PMTK220,10000*2F", // 1 per 10 sec
    "200mhz": "$PMTK220,5000*1B", // 1 per 5 sec
    "1hz": "$PMTK220,1000*1F", // 1 per 1sec
    "2hz": "$PMTK220,500*2B", // 2 per sec
    "5hz": "$PMTK220,200*2C",  // 5 per sec
    "10hz": "$PMTK220,100*2F" // 10 per sec
  },
  fix_rate: {
    "100mhz": "$PMTK300,10000,0,0,0,0*2C",
    "200mhz": "$PMTK300,5000,0,0,0,0*18",
    "1hz": "$PMTK300,1000,0,0,0,0*1C",
    "5hz": "$PMTK300,200,0,0,0,0*2F",
  },
  set_baud_rate: {
    57600: "$PMTK251,57600*2C",
    9600: "$PMTK251,9600*17"
  },
  locus: {
    "startLog": "$PMTK185,0*22",
    "stopLog": "$PMTK185,1*23",
    "startStopAck": "$PMTK001,185,3*3C",
    "queryStatus": "$PMTK183*38",
    "eraseFlash": "$PMTK184,1*22",
    "overlap": 0,
    "fullstop": 1
  },
  enable_sbas: "$PMTK313,1*2E",
  enable_waas: "$PMTK301,2*2E",
  standby: "$PMTK161,0*28",
  standby_success: "$PMTK001,161,3*36",
  awake: "$PMTK010,002*2D",
  q_release: "$PMTK605*31",
  antenna: "$PGCMD,33,1*6C",
  no_antenna: "$PGCMD,33,0*6D"
};

exports.connect = function(serial, callback, options) {
  var gps = { line:"", data: { time: { tzDiff:0 } } };
  if (options !== undefined) { gps = extendDefaults(gps, options); }
  // tell gps to send what we want from
  // settings above
  serial.println(settings.nmea_output);
  // Set the update rate
  serial.println(settings.nmea_update_rate["1hz"]);
  // antenna data? yes please.
  serial.println(settings.antenna);

  serial.on('data', function(data) {
    gps.line += data;
    var idx = gps.line.indexOf("\n");
    while (idx>=0) {
      var line = gps.line.substr(0, idx);
      gps.line = gps.line.substr(idx+1);
      //handleGPSLine(line, gps, callback);
      p.process(line, gps, callback);
      var nIdx = gps.line.indexOf("\n")
      idx = (nIdx !== undefined)? nIdx: 0;
    }
    if (gps.line.length > 80)
      gps.line = gps.line.substr(-80);
  });
  return gps;
}
