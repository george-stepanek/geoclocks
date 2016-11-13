var map, overlay, hour, infos = [];

$(document).ready(function () {
  // Initialise the map to focus on North America and Western Europe
  map = new google.maps.Map($('#map')[0], { 
    zoom: 2, 
    center: {lat: 30, lng: -45}, 
    mapTypeControl: false,
    streetViewControl: false 
  });
  $("#map").on('click', function () { 
    $("#city").blur(); 
  });

  // Square the corners of the zoom control
  google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
    var zoom = $('.gm-bundled-control > div:nth-child(1) > div');
    zoom.css({'border-radius' : 0});
  });
  
  // Initialise the night shadow overlay
  overlay = new DayNightOverlay({ 
    map: map,
    fillColor: 'rgba(0, 0, 0, 0.2)'
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
  $("input:not(#time), div, .ui-menu").on('click', function () { 
    $("#menu").hide(); 
  });
  $(".ui-menu-item").on('click', function (e) {
    hour = parseFloat(this.innerHTML.split('>')[1].slice(0, 2));
    hour = (isNaN(hour) ? undefined : hour);
    if(hour === undefined) {
      // Clicking "Now" also sets the date to today
      $("#datepicker").datepicker("setDate", new Date());
    }
    refreshTimezones();
  });
  
  // The #datepicker is an invisible overlay over the #date display
  $("#datepicker").datepicker({ 
    altField: "#date",
    altFormat: "dd M ▼",
    onSelect: function () {
      // The time cannot be "Now" if a date has been selected
      hour = (hour === undefined ? 0 : hour);
      refreshTimezones(); 
    }
  });
  $("#datepicker").datepicker("setDate", new Date());

  // Keep all of the clocks updated with the current time
  setInterval(clockTick, 200);
  
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
    $('#city').val('').focus();
    $(this).effect("highlight", {color: '#BBB'}, 600);
  }); 

  // Keep the map and menu size in sync with the window size
  resizeWindow();
  $(window).resize(resizeWindow);
});

function refreshTimezones () {
  for (i = 0; i < infos.length; i++) {
    var city = infos[i].content.split('(')[0].trim();
    showTime(city, false, updateMap, infos[i]);
  }  
}

function clockTick () {
  var now = getDateTime();
  if (hour === undefined && now.getMinutes() == 0 && 
      now.getSeconds() == 0 && now.getMilliseconds() < 200) {
    // Check hourly for any daylight savings timezone changes
    refreshTimezones();
  }
  overlay.setDate(now);

  $('#time').val(("0" + now.getHours()).slice(-2) + ':' +
                 ("0" + now.getMinutes()).slice(-2) + ":" +
                 ("0" + now.getSeconds()).slice(-2) + " ▼");

  for (i = 0; i < infos.length; i++) {
    refreshTime(now, infos[i]);
  }  
}

function getDateTime () {
  var theDate = new Date();
  var dateSet = $("#datepicker").datepicker("getDate");
  if (dateSet.setHours(0,0,0,0) != new Date().setHours(0,0,0,0)) {
    theDate = dateSet;
  }
  if (hour !== undefined) {
    theDate.setHours(hour, 0, 0, 0);
  }
  return theDate;
}

function refreshTime (now, info) {
  var offset = parseFloat(info.content.split('(')[1].split(')')[0]);
  var local = moment(now);
  local.utcOffset(offset * 60);  
  info.setContent(info.content.split('<b>')[0] + '<b>' + 
                  ("0" + local.hours()).slice(-2) + ':' +
                  ("0" + local.minutes()).slice(-2) + ":" +
                  ("0" + local.seconds()).slice(-2) + ' ' +
                  local.toString().slice(0, 3) + '</b>'); 
}

function updateMap (position, city, zone, info, now) {
  info.setContent(city + " (" + zone + ")<br/><b>&nbsp;</b>");
  refreshTime(now, info);
}

function addToMap (position, city, zone, info, now) {
  var maxLength = city.match(/[a-z]+/gi).sort(function(a, b) { 
    return b.length - a.length;
  })[0].length;
  
  var newInfo = new google.maps.InfoWindow({
    map: map, 
    position: position,
    maxWidth: maxLength > 9 ? null : 95,
    content: city + " (" + zone + ")<br/><b>&nbsp;</b>"
  });
  infos.push(newInfo);
  
  // Remove excess whitespace by hiding extraneous elements
  google.maps.event.addListenerOnce(newInfo, 'domready', function() {
    var outer = $('.gm-style-iw');
    outer.parent().css({'visibility': 'hidden'});
    outer.parent().children().css({'visibility': 'visible'});
 
    var box = outer.prev().children(':nth-child(2), :nth-child(4)');
    box.css({'display': 'none'});
    outer.next().css({'top': '18px'}); // realign close button
  });

  google.maps.event.addListener(newInfo, 'closeclick', function () {
    var gone = this.content.split('(')[0].trim();
    var rest = $.cookie("city").replace(gone, '').replace(';;', ';');
    $.cookie("city", rest, { expires: 730 });

    for (i = 0; i < infos.length; i++) {
      if (infos[i] == this) { 
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
  $("#map").height(window.innerHeight);
  if (window.innerHeight < 601) {
    $(".ui-menu").height(window.innerHeight - 32);
    $(".ui-menu").css("overflow-y", "scroll");
  }
  else {
    $(".ui-menu").css('height', 'auto');
    $(".ui-menu").css("overflow-y", "hidden");    
  }
}
