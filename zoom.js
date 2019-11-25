var i = .1;
var max = 1;

function changeZoom(zoomAmount){
  figma.viewport.zoom = zoomAmount
  if(i<max){
    i = i + .005;
    window.setTimeout(function(d){
      changeZoom(i);
    },50)
  }
}

changeZoom(i)


var x =  1280/2+.5;
var y =  620/2+.5;
var xMax = 2005.5;

var x =  2005.5;
var y =  620/2+.5;
var xMax = 3270.5;

d3.transition().duration(2000).tween("attr.fill", function() {
  var i = d3.interpolate(x, xMax);
  return function(t) {
    figma.viewport.center = {x:Math.floor(i(t))+.5,y:y}
  };
});


var zoomStart =  8.71;
var zoomEnd =  1;

var start = [920.1782295406597,354.92224344885597,100.5];
var end = [1280/2+.5,640/2+.5,720.5];

var start = [1280/2+.5,640/2+.5,720.5];
var end = [2005.5,317.45,720.5];

var w = 1280.5;
var h = 720.5;
var interpolator = d3.interpolateZoom(start, end);

d3.transition().duration(2000).tween("attr.fill", function() {
  return function(t) {
    var view = interpolator(t);
    const k = Math.min(w, h) / view[2]; // scale

    //console.log(k);
    const translate = [w / 2 - view[0] * k, h / 2 - view[1] * k]; // translate
    console.log(view[0],view[1]);
    figma.viewport.zoom = k;
    figma.viewport.center = {x:view[0],y:view[1]}
  };
});

d3.transition().duration(5000).tween("attr.fill", function() {
  var i = d3.interpolate(zoomStart, zoomEnd);
  return function(t) {
    console.log(i(t));
    figma.viewport.zoom = i(t);
  };
});
