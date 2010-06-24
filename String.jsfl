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
		return prefix+str.replace(uri,'');
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
