(function() {
	var btn = document.getElementsByClassName("download-epub-btn");
	// Check if the epub button exists on this page
	if (btn.length == 0) {return;}
	btn = btn[0];

	// get references to menu
	var popup = document.getElementsByClassName( "download-epub-cover-selector-popup" )[0];

	// buttons
	var cancel_btns = popup.getElementsByClassName( "download-epub-cancel-btn" );
	var skip_btn = popup.getElementsByClassName( "download-epub-no-cover-btn" )[0];

	// image select screen
	var image_select_screen = popup.getElementsByClassName("select-cover")[0];
	var image_select = document.getElementById( "download-epub-file" );
	var images = image_select_screen.getElementsByClassName( "download-epub-cover-img" );

	// selected image screen
	var selected_image_screen = popup.getElementsByClassName("selected-cover")[0];
	var selected_image = selected_image_screen.getElementsByClassName("download-epub-cover-img")[0];
	var add_titles_checkbox = document.getElementById("download-epub-add-label");
	// size info
	var size_info = selected_image_screen.getElementsByClassName("size-info")[0];
	var reduce_size_checkbox_hd = document.getElementById("download-epub-reduce-size-hd");
	var reduce_size_checkbox_sd = document.getElementById("download-epub-reduce-size-sd");
	var reduce_size_checkbox_neither = document.getElementById("download-epub-reduce-size-neither");
	var reduce_size_info = size_info.getElementsByClassName("download-epub-reduce-size-info")[0];
	// ok btn 
	var selected_ok_btn = selected_image_screen.getElementsByClassName("download-epub-ok-btn")[0];


	// setEPUBInfo - Function to transfer data from Hugo into JavaScript
	var epub_info = {};
	function setEPUBInfo(info) {
		epub_info = info;

		// Try to automatically load the author's cover image (see if it exists)
		var story_cover_image = images[0];
		var chapter_cover_image = images[1];

		function fixImageUrl(url) {
			if (!url) {return;}

			if (url.substr(url.length-1) == "/") {
				url = url.substr(0,url.length-1); // trim the "/" off the end
			}
			url = url.split("/").pop(); // if it's an url, get the last bit
			return epub_info.baseUrl + "images/" + url + ".jpg"; // add jpg to the end
		}

		var story_image = fixImageUrl(epub_info.story_image);
		var chapter_image = fixImageUrl(epub_info.chapter_image);

		var errors = 0;
		function checkErrors() {
			if (errors == 2) {
				// if both images were unable to load, notify user
				var elem = document.createElement("span");
				elem.innerHTML = "<small>No images found</small>";
				var prnt = document.getElementsByClassName("story-specific-images")[0];
				prnt.insertBefore(elem,prnt.children[3]);
			}
		}

		function setupImage(me,other,url) {
			if (url) {
				me.addEventListener( "error", function() {
					// The image wasn't found
					// Hide this img and make the other image a bit wider
					me.classList.add( "hidden" );
					other.classList.add( "wider" );

					errors++;
					checkErrors();
				});
				me.src = url; // set the src
			} else {
				// The image wasn't found
				// Hide this img and make the other image a bit wider
				me.classList.add("hidden");
				other.classList.add("wider");

				errors++;
				checkErrors();
			}
		}

		setupImage(chapter_cover_image,story_cover_image,chapter_image);
		setupImage(story_cover_image,chapter_cover_image,story_image);
	}
	// Make this function globally accessible
	window.setEPUBInfo = setEPUBInfo;

	// Cancel button (hide popup)
	function closePopup() {
		popup.classList.add( "hidden" );

		// get download progress elements
		var download_progress = popup.getElementsByClassName("download-progress")[0];
		var download_progress_other = popup.getElementsByClassName("download-other")[0];
		// reset them
		download_progress.classList.add("hidden");
		download_progress_other.classList.remove("blur");
		image_select_screen.classList.remove("hidden");
		selected_image_screen.classList.add("hidden");

	}
	for(var i=0;i<cancel_btns.length;i++) {cancel_btns[i].onclick = closePopup;}

	var canvas = document.getElementById("selected-cover-canvas");
	var context = canvas.getContext("2d");
	// the fonts are not loaded synchronously, so we must
	// load them manually now
	context.font = "20px AccidentalPresidency";
	context.fillText("Load this",0,0);
	context.font = "20px Trench";
	context.fillText("Load this",0,0);
	context.font = "20px TimeBurner";
	context.fillText("Load this",0,0);

	// width and height are swapped because most images are taller than they are wide
	var HD_H = 1920; 
	var HD_W = 1080;
	var SD_H = 1280;
	var SD_W = 800;

	var selected_image_i;
	function drawImageToCanvas(file,original) {
		if (original) {
			reduce_size_checkbox_hd.checked = true;
			reduce_size_checkbox_sd.checked = false;
			reduce_size_checkbox_neither.checked = false;
			add_titles_checkbox.checked = false;

			var img = new Image();
			img.onload = function(){
				var w = this.width;
				var h = this.height;

				canvas.width = w;
				canvas.height = h;
				context.width = w;
				context.height = h;

				if (w>SD_W || h>SD_H) {
					reduce_size_info.innerHTML = w + "x" + h;
					size_info.classList.remove("hidden");
				} else {
					size_info.classList.add("hidden");
				}

				drawImageToCanvas();
			}

			img.src = file;
			selected_image_i = img;
		} else {
			if (reduce_size_checkbox_hd.checked || reduce_size_checkbox_sd.checked) {
				var w = selected_image_i.width;
				var h = selected_image_i.height;
				var wanted_w = w;
				var wanted_h = h;

				if (reduce_size_checkbox_hd.checked) {
					wanted_w = HD_W;
					wanted_h = HD_H;
				} else {
					wanted_w = SD_W;
					wanted_h = SD_H;
				}

				if (w > wanted_w) {
					var ratio = w / wanted_w;
					w = w / ratio;
					h = h / ratio;
				}

				if (h > wanted_h) {
					var ratio = h / wanted_h;
					h = h / ratio;
					w = w / ratio;
				}

				canvas.width = w;
				canvas.height = h;
				context.width = w;
				context.height = h;
				context.clearRect(0,0,w,h);
				context.drawImage(selected_image_i,0,0,w,h);
			} else {
				var w = selected_image_i.width;
				var h = selected_image_i.height;
				canvas.width = w;
				canvas.height = h;
				context.width = w;
				context.height = h;
				context.clearRect(0,0,w,h);
				context.drawImage(selected_image_i,0,0,w,h);
			}

			if (add_titles_checkbox.checked) {
				function rescaleSize(n) {
					// rescale the font so it looks the same regardless of image size
					return n/768*h;
				}

				var w = context.width;
				var h = context.height;

				// percentage of screen covered by gradient
				var grad_mul_top = 0.2;
				var grad_mul_bottom = 0.32;
				// Gradient top/bottom
				grd = context.createLinearGradient(w/2, 0, w/2, h*grad_mul_top);
				grd.addColorStop(0.2, "black");
				grd.addColorStop(1, "transparent");
				context.fillStyle = grd;
				context.fillRect(0, 0, w, h*grad_mul_top);

				var grd = context.createLinearGradient(w/2, h, w/2, h*(1-grad_mul_bottom));
				grd.addColorStop(0.2, "black");
				grd.addColorStop(1, "transparent");
				context.fillStyle = grd;
				context.fillRect(0, h*(1-grad_mul_bottom), w, h*grad_mul_bottom);

				// Draw titles
				context.fillStyle = "white";
				context.textAlign = "center";
				context.textBaseline = "middle";

				context.font = rescaleSize(20)+"px AccidentalPresidency";
				var text = epub_info.author.replace(/(.)/g,function(a) {return a+"  ";});
				text = text.substr(0,text.length-1);
				var size = context.measureText(text);
				context.fillText(text,canvas.width/2,rescaleSize(32));

				context.font = "bold " + rescaleSize(48)+"px Trench";
				var text = epub_info.story_title;
				var size = context.measureText(text);
				context.fillText(text,canvas.width/2,canvas.height-rescaleSize(132));

				if (epub_info.story_title != epub_info.title) {
					context.font = "bold " + rescaleSize(32)+"px TimeBurner";
					var text = epub_info.title.replace(/(.)/g,function(a) {return a+" ";});
					var size = context.measureText(text);
					context.fillText(text,canvas.width/2,canvas.height-rescaleSize(70));
				}
			}
		}
	}

	// Images (select image)
	for(var i=0;i<images.length;i++) {
		var image = images[i];
		image.onclick = function() {
			image_select_screen.classList.add("hidden");
			selected_image_screen.classList.remove("hidden");

			drawImageToCanvas(this.src,true);
		}
	}

	// Image select
	image_select.addEventListener( "change", function() {
		if (this.files.length == 0) {return;}

		var allowed_types = {
			"image/png": true,
			"image/jpg": true,
			"image/jpeg": true,
			"image/gif": true,
			"image/svg": true,
			"image/svg+xml": true
		};

		var file = this.files[0];

		if (typeof allowed_types[file.type] == "undefined") {
			alert( "Only these file types are allowed: png, jpg, gif, svg" );
			return;
		}

		image_select_screen.classList.add("hidden");
		selected_image_screen.classList.remove("hidden");

		openImage(file,function(image) {
			drawImageToCanvas(image.target.result,true);
		});
	});

	// reduce image size & add titles checkboxes
	reduce_size_checkbox_hd.onchange = function() {drawImageToCanvas();}
	reduce_size_checkbox_sd.onchange = function() {drawImageToCanvas();}
	reduce_size_checkbox_neither.onchange = function() {drawImageToCanvas();}
	add_titles_checkbox.onchange = function() {drawImageToCanvas();}

	// Download button (open popup)
	btn.onclick = function() {
		// Open the image cover selector
		popup.classList.remove( "hidden" );
		popup.style.top = (32 + (window.pageYOffset || document.scrollTop)  - (document.clientTop || 0)) + "px";
	};

	selected_ok_btn.onclick = function() {
		canvas.toBlob(function(blob) {
			downloadEPUB( epub_info, blob, closePopup );
		},"image/jpeg",0.9);
	}

	skip_btn.onclick = function() {
		downloadEPUB( epub_info, null, closePopup );
	}
})();
