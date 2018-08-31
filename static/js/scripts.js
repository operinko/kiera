
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
	function httpGet(url, callback, callback_fail) {
		var xmlhttp = new XMLHttpRequest();

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == XMLHttpRequest.DONE) {
				if (xmlhttp.status == 200) {
					callback(xmlhttp.responseText);
				} else {
					callback_fail();
				}
			}
		};

		xmlhttp.open("GET", url, true);
		xmlhttp.send();
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
	function buildOPF( title, author, date, files ) {
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

		opf.push("</manifest>");
		opf.push("<spine>");

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
			"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
			"<link rel=\"stylesheet\" type=\"text/css\" href=\"css/css.css\" />",
			"</head>",

			// set the text
			"<body><div id=\"container\"><main><article>",
			content,
			"</article></main></div></body>",
			"</html>"
		]).join("\n");
	}

	// prefixZeroes - Helper function that adds a bunch of zeroes in front of a number
	function prefixZeroes(num) {
		if (num < 10) {return "00" + num;}
		if (num < 100) {return "0" + num;}
		return num;
	}

	// setEPUBInfo - Function to transfer data from Hugo into JavaScript
	var epub_info = {};
	function setEPUBInfo(info) {
		epub_info = info;
	}
	// Make this function globally accessible
	window.setEPUBInfo = setEPUBInfo;

	var btn = document.getElementsByClassName("download-epub-btn");
	if (btn.length > 0) {
		btn = btn[0];

		btn.onclick = function() {
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

					// <br> tags usually don't have an end tag. xhtml requires end tags
					// so we replace it with <br/>
					text = text.replace(/<br>/g,"<br/>");

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
					texts = text.split("<hr>");
					
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

						content.file( "info.opf", 
							buildOPF(
								epub_info.title,
								epub_info.author,
								epub_info.date,
								files
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
	}
})();
