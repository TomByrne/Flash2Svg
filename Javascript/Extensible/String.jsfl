(function(ext){
	/**
	 * Returns a file name from a  URI.
	 * @addon
	 */
	String.prototype.__defineGetter__(
		'basename',
		function(){
			var a=this.split("/");
			return a.pop();
		}
	);
	String.prototype.__defineGetter__(
		'extension',
		function(){
			return(this.match(/(?:\.)([^\.]*?$)/)[1]||'');
		}
	);
	/**
	 * Converts a string into a camelCased string.
	 * @addon
	 */
	String.prototype.camelCase=function(capitalize){
		var a=this.split(/\s*\s/g);//[^A-Za-z\d_\$-\/]
		if(a && a.length){
			a=new ext.Array(a);
			a=a.remove('');
			return a.ccJoin(capitalize);
		}
	};
	/**
	 * Splits a camelCased string into an array.
	 * @addon
	 */
	String.prototype.ccSplit=function(capitalize){//camelCasing >> [camel,casing]
		var output=[""];
		var split=this.trim().split(/([A-Z\z])/);
		for(var i=0;i<split.length;i++){
			var n=String(split[i]);
			if(i/2==Math.ceil(i/2)){
				if(n.length){
					output[i/2]+=(
						capitalize && i===0 ?
						n[0].toUpperCase():
						n[0].toLowerCase()
					)+n.slice(1);
				}
			}else{
				output[Math.ceil(i/2)]=(
					capitalize ?
					n.toUpperCase():
					n.toLowerCase()
				);
			}
		}
		return output;
	};
	/**
	 * Returns the parent directory for a URI.
	 * @addon
	 */
	String.prototype.__defineGetter__(
		'dir',
		function(){
			return(this.replace(/\/?[^\/]*?$/g,""));
		}
	);
	/**
	 * Returns a URI relative to another URI.
	 * @addon
	 */
	String.prototype.relativeTo=function(uri){
		var str=this;
		if(!/(^file:\/\/)/.test(str)){
			str=FLfile.platformPathToURI(str);
		}
		if(!/(^file:\/\/)/.test(uri)){
			uri=FLfile.platformPathToURI(uri);
		}
		var prefix='.';
		while(str.indexOf(uri)<0 && uri.indexOf('/')>0){
			prefix+='/..';
			uri=uri.dir;
		}
		str=str.replace(uri,'');
		while(str.slice(0,1)=='/'){
			str=str.slice(1);	
		}
		return str;
	};
	/**
	 * Returns an absolute URI from a relative URI 
	 * from reference point uri.
	 * @addon
	 */
	String.prototype.absoluteURI=function(dir){
		if(/^file\:/.test(this)){
			return this;
		}
		var str=this.replace('\\','/');
		if(!/(^file:\/\/)/.test(dir)){
			dir=FLfile.platformPathToURI(dir);
		}
		str=str.replace(/^\.\//,'');
		var updir=/\.\.\//;
		if(updir.test(str)){
			var up=/^\.\.\//;
			var re=/^(.*?)(\.\.\/)/;
			while(str.length){
				while(dir[dir.length-1]=='/'){
					dir=dir.slice(0,-1);	
				}
				if(up.test(str)){
					dir=dir.dir;
					str=str.replace(up,'');
				}else{
					if(dir.slice(-1)!='/'){
						dir+='/';
					}
					if(updir.test(str)){
						var match=str.match(re);
						if(match.length>1 && match[1].length>0){
							dir+=match[1];
							str=str.replace(re,'$2');
						}
					}else{
						dir+=str;
						str='';
					}
				}
			}
		}else{
			dir+='/'+str;
		}
		return dir;
	};
	/**
	 * Returns a document-relative  URI from an absolute URI.
	 * @addon
	 */
	String.prototype.__defineGetter__('relativeToDocument',function(){
		return this.relativeTo(ext.doc.pathURI.dir);
	});
	/**
	 * Returns a URI or file name minus the extension.
	 * @addon
	 */
	String.prototype.stripExtension=function(){
		return(this.replace(/\.[^\.]*?$/g,""));
	};
	/**
	 * Removes the whitespace at the beginning and end of a string.
	 * @addon
	 */
	String.prototype.trim=function(){
	    return this.replace(/^\s+|\s+$/g,"");
	};
	String.prototype.__defineGetter__(
		'uniqueFileName',
		function(){
			var str=this;
			if(!/^file\:/.test(str)){
				str=FLfile.platformPathToURI(str);
			}
			if(FLfile.exists(str)){
				var ext=str.extension;
				var parts=str.stripExtension().match(/(.*[^\d])([\d][\d]*$)?/);
				if(parts.length>1){
					return(
						(
							parts[1]
							+(parts[2]?String(Number(parts[2])+1):'1')
							+'.'
							+ext
						).uniqueFileName
					);
				};
			}else{
				return str;	
			}
		}
	);
	String.prototype.__defineGetter__(
		'bytes',
		function(){
			var array=[];
			for(var i=0;i<this.length;i++){
				array.push(this.charCodeAt(i));
			}
			return array;
		}
	);
	String.prototype.__defineGetter__(
		'base64',
		function(){
			s=this;
			var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
			// the result/encoded string, the padding string, and the pad count
			var r = ""; 
			var p = ""; 
			var c = s.length % 3;
			// add a right zero pad to make this string a multiple of 3 characters
			if (c > 0) { 
				for (; c < 3; c++) { 
				  p += '='; 
				  s += "\0";
				}
			}
			// increment over the length of the string, three characters at a time
			for (c = 0; c < s.length; c += 3) {
				// we add newlines after every 76 output characters, according to the MIME specs
				if (c > 0 && (c / 3 * 4) % 76 == 0){
				  r+="\n";
				}
				// these three 8-bit (ASCII) characters become one 24-bit number
				var n = s.charCodeAt(c);//(s.charCodeAt(c) << 16) + (s.charCodeAt(c+1) << 8) + s.charCodeAt(c+2);
				// this 24-bit number gets separated into four 6-bit numbers
				n = [(n >>> 18) & 63, (n >>> 12) & 63, (n >>> 6) & 63, n & 63];
				// those four 6-bit numbers are used as indices into the base64 character list
				r += chars[n[0]] + chars[n[1]] + chars[n[2]] + chars[n[3]];
			}
			// add the actual padding string, after removing the zero pad
			return r.substring(0, r.length - p.length) + p;
		}
	);
	String.prototype.safeFileName=function(replaceString){
		if(replaceString){
			return(
				this.replace(
					/[\?\[\]\/\\\=\+\<\>\:\;\"\,\*\%]|^\./g,
					replaceString
				)
			);
		}else{
			return(
				this.replace(
					/\//g,'.'
				).replace(
					/\?/g,
					'(QuestionMark)'
				).replace(
					/\[/g,
					'(LeftBracket)'
				).replace(
					/\]/g,
					'(RightBracket)'
				).replace(
					/\//g,
					'(ForwardSlash)'
				).replace(
					/\\/g,
					'(BackSlash)'
				).replace(
					/\[/g,
					'(Equal)'
				).replace(
					/\+/g,
					'(Plus)'
				).replace(
					/\</g,
					'(LessThan)'
				).replace(
					/\>/g,
					'(GreaterThan)'
				).replace(
					/\:/g,
					'(Colon)'
				).replace(
					/\;/g,
					'(SemiColon)'
				).replace(
					/\"/g,
					'(Quote)'
				).replace(
					/\,/g,
					'(Comma)'
				).replace(
					/\*/g,
					'(Asterisk)'
				).replace(
					/\%/g,
					'(Modulo)'
				).replace(
					/\|/g,
					'(Bar)'
				).replace(
					/^\./,
					'(Period)'
				)
			);
		}
	};
})(extensible)
