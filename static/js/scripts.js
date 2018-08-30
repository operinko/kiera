
// Controls the invert button
(function() {
  var btn = document.getElementById("invert-btn");
  var inverted = false;
  btn.onclick = function() {
    inverted = !inverted;

    if (inverted) {
      document.body.classList.add( "inverted" );
    } else {
      document.body.classList.remove( "inverted" );
    }
  }
})();