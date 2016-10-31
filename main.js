var map, hour, infos = [];

$(document).ready(function () {
  // Initialise the map to focus on North America and Western Europe
  map = new google.maps.Map($('#map')[0], { 
    zoom: 2, 
    center: {lat: 30, lng: -45}, 
    mapTypeControl: false,
    streetViewControl: false 
  });
  
  // Initialise the night shadow overlay
  var overlay = new DayNightOverlay({ 
    map: map,
    fillColor: 'rgba(0, 0, 0, 0.2)',
  });
  
  // Initialise the menu
  for (var i = 0; i < 24; i++) {
    var hours = ("0" + i).slice(-2);
    $("#menu").append("<li><div>" + hours + ":00</div></li>");
  }  
  $("#menu").menu().hide();
  
  // Menu show/hide and click handlers
  $("#time").on('click', function () { 
    $("#menu").show(); 
  });
  $("input, #find, #map, .ui-menu-item").on('click', function () { 
    $("#menu").hide(); 
  });
  $(".ui-menu-item").on('click', function (e) {
    hour = parseFloat(this.innerHTML.split('>')[1].slice(0, 2));
    hour = (isNaN(hour) ? undefined : hour);
    if(hour == undefined) {
      // Clicking "Now" also sets the date to today
      $("#date").datepicker("setDate", new Date());
    }
    refreshTimezones();
  });
  
  // Initialise the date picker
  $("#date").val($.datepicker.formatDate("dd M ▼", new Date()));
  $("#date").datepicker({ 
    dateFormat: "dd M ▼",
    onSelect: function () {
      // The time cannot be "Now" if a date has been selected
      hour = (hour == undefined ? 0 : hour);
      refreshTimezones(); 
    }
  });

  // Keep all clocks updated with the current time
  setInterval(function () {
    clockTick(overlay);
  }, 200);
  
  // Load the previously selected locations from the cookie
  if ($.cookie("city")) {
    var cities = $.cookie("city").split(';');
    for (i = 0; i < cities.length; i++) {
      if (cities[i].length > 0) { 
        showTime(cities[i], false, addToMap); 
      }
    }
  }

  // The Enter key can be used to submit requests, and Esc to clear
  $('#city').focus().keyup(function (e) {
    if (e.keyCode == 13) { 
      $('#find').click(); 
    }
    if (e.keyCode == 27) { 
      $('#city').val(''); 
    }
  });

  // Search button handler
  $('#find').on('click', function () {
    findCity();    
    $('#city').val('');
  }); 

  // Keep the map and menu size in sync with the window size
  resizeWindow();
  $( window ).resize(function() { 
    resizeWindow(); 
  });
});

function refreshTimezones () {
  for (i = 0; i < infos.length; i++) {
    var city = infos[i].content.split('(')[0].trim();
    showTime(city, false, updateMap, infos[i]);
  }  
}

function clockTick (overlay) {
  var now = getDateTime();
  if (hour == undefined && now.getMinutes() == 0 && 
      now.getSeconds() == 0 && now.getMilliseconds() < 200) {
    // Check hourly for any daylight savings timezone changes
    refreshTimezones();
  }
  overlay.setDate(now);

  $('#time').text(("0" + now.getHours()).slice(-2) + ':' +
                  ("0" + now.getMinutes()).slice(-2) + ":" +
                  ("0" + now.getSeconds()).slice(-2) + " ▼");

  for (i = 0; i < infos.length; i++) {
    refreshTime(now, infos[i]);
  }  
}

function getDateTime () {
  var now = new Date();
  var d = new Date($('#date').val().slice(0, 7) + now.getFullYear());
  if (d.getDate() != now.getDate() || d.getMonth() != now.getMonth()) {
    now = d;
  }
  if (hour != undefined) {
    now.setHours(hour, 0, 0, 0);
  }
  return now;
}

function refreshTime (now, info) {
  var content = info.content;
  var offset = parseFloat(content.split('(')[1].split(')')[0]);
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var local = new Date(utc + offset * 3600000);

  info.setContent(content.split('<b>')[0] + '<b>' + 
                  ("0" + local.getHours()).slice(-2) + ':' +
                  ("0" + local.getMinutes()).slice(-2) + ":" +
                  ("0" + local.getSeconds()).slice(-2) + ' ' +
                  local.toString().slice(0, 3) + '</b>'); 
}

function updateMap (position, city, zone, info, now) {
  info.setContent(city + " (" + zone + ")<br/><b>&nbsp;</b>");
  refreshTime(now, info);
}

function addToMap (position, city, zone, info, now) {
  var info = new google.maps.InfoWindow({
    map: map, 
    position: position,
    maxWidth: 90,
    content: city + " (" + zone + ")<br/><b>&nbsp;</b>"
  });
  infos.push(info);

  google.maps.event.addListener(info, 'closeclick', function () {
    var gone = this.content.split('(')[0].trim();
    var rest = $.cookie("city").replace(gone, '').replace(';;', ';');
    $.cookie("city", rest, { expires: 730 });

    for (i = 0; i < infos.length; i++) {
      if (infos[i] == info) { 
        infos.splice(i, 1);
        break;
      }
    }
  });  
}

function showTime (city, isBeingAdded, callback, info) {
  var key = "key=AIzaSyDWtKaxE0vsWdq9lPwCqbuBb3R4S0KyV-U";
  var url = "https://maps.googleapis.com/maps/api/geocode/json?" + 
      key + "&address=" + city;

  $.get(url, function (geocode) {
    if (geocode.results.length == 0) {
      var list = $.cookie("city").replace(city, '');
      $.cookie("city", list.replace(';;', ';'), { expires: 730 });
      if (isBeingAdded) { 
        alert('Sorry, "' + city + '" cannot be found.');
      }
      return;
    }
    
    var now = getDateTime();
    var position = geocode.results[0].geometry.location;
    url = "https://maps.googleapis.com/maps/api/timezone/json?" + 
      key + "&location=" + position.lat + "," + position.lng + 
      "&timestamp=" + Math.floor(now / 1000);

    $.get(url, function (result) {
      var offset = result.rawOffset + result.dstOffset;
      var zone = (offset >= 0 ? '+' : '') + offset / 3600;
      callback(position, city, zone, info, now);
    }); 
  });
}

function findCity () {
  var acronyms = ['UK', 'GB', 'US', 'USA', 'PNG', 'UAE', 'NZ'];
  var city = $('#city').val().replace(/\w\S*/g, function(t) {
    if (acronyms.indexOf(t.toUpperCase()) > -1) {
      return t.toUpperCase();
    }
    else {
      return t[0].toUpperCase() + t.substr(1).toLowerCase();
    }
  });

  if (!$.cookie("city") || !$.cookie("city").includes(city)) {
    showTime(city, true, addToMap); 
    var previous = $.cookie("city") ? $.cookie("city") + ";" : "";
    $.cookie("city", previous + city, { expires: 730 });
  }
}

function resizeWindow () {
  $("#map").height(window.innerHeight - 17);
  if (window.innerHeight < 610) {
    $(".ui-menu").height(window.innerHeight - 43);
    $(".ui-menu").css("overflow-y", "scroll");
  }
  else {
    $(".ui-menu").css('height', 'auto');
    $(".ui-menu").css("overflow-y", "hidden");    
  }
}
