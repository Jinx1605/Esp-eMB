


function extendDefaults(source, properties) {
   var property;
   for(property in properties) {
       if(properties.hasOwnProperty(property)) {
           source[property] = properties[property];
       }
   }
   return source;
}

function USBSabertooth(serial, options) {
  this.serial = serial;
  if (options !== undefined) { this = extendDefaults(this, options); }
}

USBSabertooth.prototype.connect = function(callback) {
  var ST = this;
  ST.serial.on('data',function (data) {
    console.log('data::incoming', data);
  });
  // serial.on('data',function(){});
  // serial.on('data',function(){});
  // serial.on('data',function(){});
  // serial.on('data',function(){});
  // serial.on('data',function(){});
  // serial.on('data',function(){});
  setTimeout(function() {

    if (callback) callback();
  },100);
};

exports.connect = function (serial, options, callback) {
  var ST = new USBSabertooth(serial, options);
  ST.connect(callback);
  return ST;
}
