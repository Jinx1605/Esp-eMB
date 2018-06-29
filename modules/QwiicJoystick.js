exports.connect = function (_i2c) {
  var i2c = _i2c;
  return {
    read : function () {
      var d = i2c.readFrom(0x20,);
    }
  };
};
