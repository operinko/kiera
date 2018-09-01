
// Controls the invert button
(function() {
	var btn = document.getElementById("invert-btn");

	if (typeof localStorage.inverted == "undefined") {
		localStorage.inverted = "0";
	}

	function apply() {
		if (localStorage.inverted == "1") {
			document.body.classList.add( "inverted" );
		} else {
			document.body.classList.remove( "inverted" );
		}
	}
	apply();

	btn.onclick = function() {
		localStorage.inverted = (localStorage.inverted == "0" ? "1" : "0");
		apply();
	}
})();

// Handle epub generation
(function() {
	// httpGet - Helper function to get a file from the server
	// Basically used only to get the CSS file to style the epub contents properly
	function httpGet(url, callback, callback_fail, is_binary) {
		var xmlhttp = new XMLHttpRequest();

		if (typeof is_binary == "undefined") {is_binary = false;}

		if (is_binary == true) {
			xmlhttp.responseType = "blob";
		}

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == XMLHttpRequest.DONE) {
				if (xmlhttp.status == 200) {
					var response = (is_binary ? xmlhttp.response : xmlhttp.responseText);
					callback(response);
				} else {
					callback_fail();
				}
			}
		};

		xmlhttp.open("GET", url, true);
		xmlhttp.send();
	}

	// openFile - Helper function mainly used to get the contents
	// of a file that was selected using an <input type='file'>
	function openFile( file, callback ) {
		var name = file.name;
		var type = file.type;

		var reader = new FileReader();

		if (reader.readAsBinaryString) {
			reader.onloadend = callback;
			reader.readAsBinaryString( file );
		} else {
			reader.onloadend = function(e) {
				var bytes = new Uint8Array(e.target.result);
				var binary = "";
				for (var i = 0; i < bytes.byteLength; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				callback({target:{result:binary}});
			}
			reader.readAsArrayBuffer( file );
		}
	}

	// buildContainerXML - Helper function to create one of the required epub files
	function buildContainerXML() {
		return ([
			"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			"<container xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\" version=\"1.0\">",
				"<rootfiles>",
					"<rootfile full-path=\"content/info.opf\" media-type=\"application/oebps-package+xml\"/>",
				"</rootfiles>",
			"</container>"
		]).join("\n");
	}

	// buildOPF - Helper function to create one of the required epub files
	// Takes a list of file names to add to its manifest
	function buildOPF( title, author, date, files, cover_filetype ) {
		// replace all non-alphanumeric characters with "-" to build a uid
		var title_uid = title.replace(/[^a-zA-Z0-9]/g, "-");

		var opf = [
			"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			"<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"3.0\" xml:lang=\"en\" unique-identifier=\"uid\">",
				"<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">",
					"<dc:title>" + title + "</dc:title>",
					"<dc:creator>" + author + "</dc:creator>",
					"<dc:language>en-US</dc:language>",
					"<dc:identifier id=\"uid\">" + title_uid + "</dc:identifier>",
					"<meta property=\"dcterms:modified\">" + date + "</meta>",
				"</metadata>",
				"<manifest>"];

		// Add the files to the manifest
		for(var i=0;i<files.length;i++) {
			var filename = files[i].filename;
			opf.push("<item id=\"part" + (i+1) + "\" href=\"" + filename + "\" media-type=\"application/xhtml+xml\" />");
		}

		// Add the navigation file to the manifest
		opf.push( "<item id=\"nav\" href=\"nav.xhtml\" media-type=\"application/xhtml+xml\" properties=\"nav\" />" );

		// Add the css file to the manifest
		opf.push( "<item id=\"css\" href=\"css/css.css\" media-type=\"text/css\" />" );

		// Add the cover image to the manifest
		if (cover_filetype != "") {
			opf.push( "<item id=\"cover-image\" href=\"cover." + cover_filetype + "\" media-type=\"image/" + cover_filetype + "\" properties=\"cover-image\" />" );
			opf.push( "<item id=\"cover\" href=\"cover.xhtml\" media-type=\"application/xhtml+xml\" />" );
		}

		opf.push("</manifest>");
		opf.push("<spine>");

		// Add the cover image to the spine
		if (cover_filetype != "") {
			opf.push( "<itemref idref=\"cover\" linear=\"no\" />" );
		}

		// Add the files to the spine
		for(var i=0;i<files.length;i++) {
			var filename = files[i].filename;
			opf.push("<itemref idref=\"part" + (i+1) + "\" />");
		}

		opf.push("</spine>");
		opf.push("</package>");

		return opf.join("\n");
	}

	// buildFile - Helper function to create the main content in the epub
	// Used to build each chapter of the book, and also the nav file.
	function buildFile(content, is_nav) {
		var nav = "";
		// if the file being created is the nav file, we need an extra option
		if (typeof is_nav != "undefined" && is_nav == true) {
			nav = " xmlns:epub=\"http://www.idpf.org/2007/ops\"";
		}

		return ([
			// set the header stuff
			"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			"<html xmlns=\"http://www.w3.org/1999/xhtml\"" + nav + ">",
			"<head><title>Deathworlders.com</title>",
			"<meta charset=\"utf-8\" />",
			"<link rel=\"stylesheet\" type=\"text/css\" href=\"css/css.css\" />",
			"</head>",

			// set the text
			"<body><article>",
			content,
			"</article></body>",
			"</html>"
		]).join("\n");
	}

	// prefixZeroes - Helper function that adds a bunch of zeroes in front of a number
	function prefixZeroes(num) {
		if (num < 10) {return "00" + num;}
		if (num < 100) {return "0" + num;}
		return num;
	}

	// downloadEPUB - Does all the work
	var epub_info = {};
	function downloadEPUB( cover_image, cover_filename ) {
		try {
			var baseUrl = epub_info.baseUrl;
			var book_title = epub_info.title;

			httpGet( baseUrl + "css/styles.css", function( css_file ) {
				// get the html
				var text = document.getElementsByTagName( "article" )[0].innerHTML;

				// position:absolute; is not allowed in EPUB
				// blockquote::before contains this tag
				// so we'll just erase the whole thing
				css_file = css_file.replace(/blockquote::before *?{[^}]*?}/g,"");

				// and also replace any leftovers
				css_file = css_file.replace(/position:absolute;/g, "");

				// <br> tags usually don't have an end tag. xhtml requires end tags
				// so we replace it with <br/>
				text = text.replace(/<br>/g,"<br/>");

				var texts = [];
				var ending = "";

				// First find the end of the chapter
				var pt = /(<hr>[ \n]*?<hr>)/g
				var ending = pt.exec(text);
				if (ending && ending.length > 0) {
					var startPos = ending.index;

					// Get everything from the chapter end point to the end of the document
					ending = text.substring(startPos);

					// <hr> tags usually don't have an end tag. xhtml requires end tags
					ending = ending.replace(/<hr>/g,"<hr />");

					// Erase everything from text after the ending part
					text = text.substring(0,startPos);
				} else {
					// Assume this chapter doesn't have an ending section
					ending = "";
				}
				
				// Now split the text on each <hr>
				var texts = text.split("<hr>");
				
				// Insert the ending at the end of the texts list
				if (ending != "") {
					texts.push(ending);
				}

				// zip time
				var zip = new JSZip();
					zip.file("mimetype","application/epub+zip");

				// content folder
				var content = zip.folder( "content" );
					
					// add content files
					var files = [];
					for(var i=0;i<texts.length;i++) {
						var text = texts[i];

						var title = "Part " + (i+1);
						var filename = "part_" + prefixZeroes(i+1) + ".xhtml";

						var html = buildFile( text );
						content.file( filename, html );

						files.push({
							filename: filename,
							title: title
						});
					}

					// Handle cover image
					var cover_filetype = "";
					if (typeof cover_filename != "undefined" && cover_filename != "") {
						cover_filetype = cover_filename.split('.').pop();

						// Apparently, jpg is not supported for some reason. Swap to jpeg
						if (cover_filetype == "jpg") {cover_filetype = "jpeg";}

						content.file( "cover." + cover_filetype, cover_image );
						content.file( "cover.xhtml", "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"+
														"<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">"+
														"<head><title>Deathworlders.com</title>"+
														"<meta charset=\"utf-8\"/></head>"+
														"<body><img src=\"cover."+cover_filetype+"\"/></body></html>" );
					}

					content.file( "info.opf", 
						buildOPF(
							epub_info.title,
							epub_info.author,
							epub_info.date,
							files,
							cover_filetype
						)
					);

					// build nav file contents
					var nav = ["<nav epub:type=\"toc\" id=\"toc\"><ol>"];
					for(var i=0;i<files.length;i++) {
						nav.push( "<li><a href=\"" + files[i].filename + "\">" + files[i].title + "</a></li>" );
					}
					nav.push("</ol></nav>");

					// add nav file
					content.file( "nav.xhtml", buildFile(nav.join("\n"),true));

				// Meta folder
				var meta = zip.folder( "META-INF" );
					meta.file( "container.xml", buildContainerXML() );

				// CSS folder
				var css = content.folder( "css" );
					css.file( "css.css", css_file );

				zip.generateAsync({type:"blob"}).then(function(content) {
					// delete all non-alphanumeric characters in the title to use it as the file name
					var filename = epub_info.title.replace( /[^a-zA-Z0-9]/g, "" );
					saveAs(content,filename+".epub");
				});
			}, function() {
				alert( "Oh no! Couldn't get the CSS file, sorry." );
			});
		} catch( error ) {
			alert( "Oh no! Something went wrong. Maybe your browser doesn't support the features required to generate an EPUB file?" +
					" Try it with a different browser. I've tested it in Chrome myself. Otherwise, report the issue to https://github.com/deathworlders/online."+
					" Here is the error message: '" + error.toString() + "'" );
		}
	}

	var btn = document.getElementsByClassName("download-epub-btn");
	// Check if the epub button exists on this page
	if (btn.length > 0) {
		btn = btn[0];

		var popup = document.getElementsByClassName( "download-epub-cover-selector-popup" )[0];
		var cancel_btn = document.getElementsByClassName( "download-epub-cancel-btn" )[0];
		var image_select = document.getElementById( "download-epub-file" );
		var images = document.getElementsByClassName( "download-epub-cover-img" );
		var skip_btn = document.getElementsByClassName( "download-epub-no-cover-btn" )[0];

		// setEPUBInfo - Function to transfer data from Hugo into JavaScript
		function setEPUBInfo(info) {
			epub_info = info;

			// Try to automatically load the author's cover image (see if it exists)
			var authors_cover_image = images[2];

			var filename = epub_info.url.substr(0,epub_info.url.length-1); // trim the "/" off the end
			filename = filename.split("/").pop(); // get the last bit
			filename = epub_info.baseUrl + "images/" + filename + ".jpg"; // add jpg to the end

			authors_cover_image.addEventListener( "error", function() {
				// The image wasn't found :(
				// Hide this img and make the other images a bit wider
				authors_cover_image.classList.add( "hidden" );
				for(var i=0;i<images.length-1;i++) {
					images[i].classList.add( "wider" );
				}
			});
			authors_cover_image.src = filename; // set the src
		}
		// Make this function globally accessible
		window.setEPUBInfo = setEPUBInfo;

		// Cancel button (hide popup)
		function closePopup() {
			popup.classList.add( "hidden" );
		}
		cancel_btn.onclick = closePopup;

		// Images (begin EPUB generation)
		for(var i=0;i<images.length;i++) {
			var image = images[i];
			image.onclick = function() {
				var src = this.src;
				httpGet( src, function( cover_image ) {
					downloadEPUB( cover_image, src );
					closePopup();
				}, function() {
					alert( "Oh no! Couldn't get the image file, sorry." );
				}, true); // is_binary = true
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

			downloadEPUB( file, file.name );
			closePopup();
		});

		// Download button (open popup)
		btn.onclick = function() {
			// Open the image cover selector
			popup.classList.remove( "hidden" );
		};

		skip_btn.onclick = function() {
			downloadEPUB();
			closePopup();
		}
	}
})();
