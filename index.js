/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
/*global */
/*
* Author: Zion Orent 
* Copyright (c) 2014 Intel Corporation.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var mqtt = require('mqtt');
//Load Barometer module
//var bmpx8x = require('jsupm_bmpx8x');

var running=true; 
var getFake=function(name){
  switch(name){
    case 'Barometer':
    return {
            getPressure:function(){
              return Math.random()*100;
            },
            getTemperature:function(){
              return (Math.random()*100)-100;
            },
            getAltitude:function(){
              return 1;
            },
            getSealevelPressure:function(){
              return (Math.random()*800);
            }
          };
    break;
    case 'Sonic':
      return{
        getNearestObject:function(){
          return 1.234234;
        }
      }
      break;
    case 'Photo':
     return{
      getPhoto:function(){
        return {
          red:0.122,
          green:0.234,
          blue:0.5656,
          other:0.234
          }
        }
      }
      break;
    default:return {};
  }

}

// load this on i2c
//var myBarometerObj = new bmpx8x.BMPX8X(0, bmpx8x.ADDR);
var myBarometerObj=getFake('Barometer');
var pressure, temperature, altitude, sealevel;
var mySonic=getFake('Sonic');
var myPhoto=getFake('Photo');

var client = mqtt.connect({
  servers:[{'host':'mqtt.relayr.io'}],
  username: "a48fb7cc-639b-4ce7-9781-bbc18760e4cc",
  password: "pQlk1QCk_cR6",
  clientId: "TpI+3zGObTOeXgbvBh2DkzA",
  protocol : 'mqtts'
});

var flashLed=function(){
  console.log("flash from relayr");
}
var goUp=function(){
  console.log("go up");
}
var goUp=function(){
  console.log("go down");
}

var GetBarometer=function(){
    var jsonResults={pressure:myBarometerObj.getPressure(),
                    altitude:myBarometerObj.getAltitude(),
                    sealevel:myBarometerObj.getSealevelPressure(),
                    temperature:myBarometerObj.getTemperature()};
  return jsonResults; 
}
var GetPhoto=function(){
    var jsonResults={
      Photo:myPhoto.getPhoto()
    }
}

var GetSonicDetection=function(){
    var jsonResults={
        distance:mySonic.getNearestObject()
    }
    return jsonResults;
}
var SendReport=function(o){
    var r={running:running,
          pack:o};
    r={pressure:o.Barometer.pressure,
     temperature:o.Barometer.temperature,
     altitude:o.Barometer.altitude,
     sealevel:o.Barometer.sealevel};
    var data = JSON.stringify(r);
    data = JSON.stringify({meaning:"agg_model", value: r});
    client.publish("/v1/a48fb7cc-639b-4ce7-9781-bbc18760e4cc/data", data, function() {
    });
    var data2 = JSON.stringify({meaning:"pressure", value: o.Barometer.pressure});
    client.publish("/v1/a48fb7cc-639b-4ce7-9781-bbc18760e4cc/data", data2, function() {
    });
    var data3 = JSON.stringify({meaning:"temperature", value: o.Barometer.temperature});
    client.publish("/v1/a48fb7cc-639b-4ce7-9781-bbc18760e4cc/data", data3, function() {
    });
    var data4 = JSON.stringify({meaning:"sealevel", value: o.Barometer.sealevel});
    client.publish("/v1/a48fb7cc-639b-4ce7-9781-bbc18760e4cc/data", data4, function() {
    });
    //console.log({data:data,data2:data2,data3:data3,data4:data4});
    
}
var SendNotRunningReport=function(){
    SendReport({empty:true});
}
var StartDetection=function(){
    running=true;
}
var EndDetection=function(){
    running=false;
}
var CheckCommands=function(){
    //check the current command pipeline
}


// Print the pressure, altitude, sea level, and
// temperature values every 0.1 seconds
setInterval(function()
{
    CheckCommands();
    if(running){
        var barResults=GetBarometer();
        var sonicDetect=GetSonicDetection();
        var photo=GetPhoto();
        var combined={
            Barometer:barResults,
            Distance:sonicDetect,
            Photo:photo
        }
        SendReport(combined);
    }else{
        SendNotRunningReport();
    }
    
}, 1000);

client.on('connect', function() {
console.log("connected");
  //subscribe to commands sent from the dashboard or other clients
  client.subscribe("/v1/a48fb7cc-639b-4ce7-9781-bbc18760e4cc/cmd");

  
  client.on('flash', function(topic, message) {
      flashLed();
  });
    client.on('go_up', function(topic, message) {
      goUp();
  });
    client.on('go_down', function(topic, message) {
      console.log("go down from relayr");
  });

  //simple timer to send a message every 1 second
  /*var publisher = setInterval(function(){
    var barResults=GetBarometer();
        var sonicDetect=GetSonicDetection();
        var photo=GetPhoto();
        var o={
            Barometer:barResults,
            Distance:sonicDetect,
            Photo:photo
        }
        r={pressure:o.Barometer.pressure,
     temperature:o.Barometer.temperature,
     altitude:o.Barometer.altitude,
     sealevel:o.Barometer.sealevel};
    var data = JSON.stringify(r);
    data = JSON.stringify({meaning:"agg_model", value: r});

    //client.publish("/v1/5bc31bc8-240f-4f50-b5dd-84f12d683b05/data", data, function() {
    //});

  }, 100000);
*/

});


// Print message when exiting
process.on('SIGINT', function()
{
  console.log("Exiting...");
  process.exit(0);
});

