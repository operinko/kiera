
// Controls the invert button
(function() {
  var btn = document.getElementById("invert-btn");

  if (typeof localStorage.inverted == "undefined") {
  	localStorage.inverted = "0";
  }

  btn.onclick = function() {
    localStorage.inverted = (localStorage.inverted == "0" ? "1" : "0");

    if (localStorage.inverted == "1") {
      document.body.classList.add( "inverted" );
    } else {
      document.body.classList.remove( "inverted" );
    }
  }
})();