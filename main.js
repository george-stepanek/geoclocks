var hour;
var infos = [];

$(document).ready(function() {
  $("#map").height(window.innerHeight - 17);

  var map = new google.maps.Map($('#map')[0], { 
    zoom: 2, 
    center: {lat: 10, lng: -45}, 
    mapTypeControl: false,
    streetViewControl: false 
  });
  
  new DayNightOverlay({ 
    map: map,
    fillColor: 'rgba(0, 0, 0, 0.2)',
  });
  
  for(var i = 0; i < 24; i++) {
    $("#menu").append("<li><div>" + 
      ("0" + i).slice(-2) + ":00</div></li>")
  }
  
  $("#menu").menu().hide();
  if(window.innerHeight < 653) {
    $(".ui-menu").height(window.innerHeight - 48);
    $(".ui-menu").css("overflow-y", "scroll");
  }
  
  $("#time").on('click', function () { 
    $("#menu").toggle(); 
  });
  $("#city, #find, #map, .ui-menu-item").on('click', function () { 
    $("#menu").hide(); 
  });
  $(".ui-menu-item").on('click', function (e) { 
    hour = parseFloat(this.innerHTML.split('>')[1].slice(0, 2));
  });

  setInterval(function() {
    var now = new Date();
    if(hour || hour == 0) {
      now.setHours(hour, 0, 0, 0);
    }
    
    $('#time').text(("0" + now.getHours()).slice(-2) + ':' +
      ("0" + now.getMinutes()).slice(-2) + ":" +
      ("0" + now.getSeconds()).slice(-2) + " ▼");
    
    for(i = 0; i < infos.length; i++) {
      var content = infos[i].content;
      var offset = parseFloat(content.split('(')[1].split(')')[0]);
      var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      var local = new Date(utc + offset * 3600000);
      
      infos[i].setContent(content.split('<b>')[0] + '<b>' + 
        ("0" + local.getHours()).slice(-2) + ':' +
        ("0" + local.getMinutes()).slice(-2) + ":" +
        ("0" + local.getSeconds()).slice(-2) + ' ' +
        local.toString().slice(0, 3) + '</b>');
    }
  }, 500);
  
  if($.cookie("city")) {
    var cities = $.cookie("city").split(';');
    for(i = 0; i < cities.length; i++) {
      if(cities[i].length > 0) { 
        showTime(map, cities[i], false); 
      }
    }
  }
  
  $('#city').focus().keypress(function (e) {
    if(e.keyCode == 13) { 
      $('#find').click(); 
    }
  });

  $('#find').on('click', function () {
    var city = $('#city').val().replace(/\w\S*/g, function(t) {
        return t[0].toUpperCase() + t.substr(1).toLowerCase(); 
    });
    
    if(!$.cookie("city") || !$.cookie("city").includes(city)) {
      showTime(map, city, true); 
      var previous = $.cookie("city") ? $.cookie("city") + ";" : "";
      $.cookie("city", previous + city, { expires: 730 });
    }
    
    $('#city').val('');
  }); 
});

function showTime(map, city, save) {
  var key = "key=AIzaSyDWtKaxE0vsWdq9lPwCqbuBb3R4S0KyV-U";
  var url = "https://maps.googleapis.com/maps/api/geocode/json?" + 
      key + "&address=" + city;

  $.get(url, function (geocode) {
    if(geocode.results.length == 0) {
      if(save) { 
        alert('Sorry, "' + city + '" cannot be found.');
      }
      return;
    }
    
    var position = geocode.results[0].geometry.location;
    url = "https://maps.googleapis.com/maps/api/timezone/json?" + 
      key + "&location=" + position.lat + "," + position.lng + 
      "&timestamp=" + Math.floor(Date.now() / 1000);

    $.get(url, function (result) {
      var offset = result.rawOffset + result.dstOffset;
      var zone = (offset > 0 ? '+' : '') + offset / 3600;
      var info = new google.maps.InfoWindow({
        map: map, 
        position: position,
        content: city + " (" + zone + ")<br/><b>&nbsp;</b>"
      });
      infos.push(info);
      
      google.maps.event.addListener(info, 'closeclick', function() {
        var gone = this.content.split('(')[0].trim();
        var remaining = $.cookie("city").replace(gone, '');
        remaining = remaining.replace(';;', ';'); 
        $.cookie("city", remaining, { expires: 730 });
        
        for(i = 0; i < infos.length; i++) {
          if(infos[i] == info) { 
            infos.splice(i, 1);
            break;
          }
        }
      });
    }); 
  });
}
