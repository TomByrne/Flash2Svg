(function(ext){
	function ExtensibleText(text,options){
		ext.Element.apply(this,arguments);
		return this;
	}
	ExtensibleText.prototype={
		__proto__:ext.Element.prototype,
		type:ExtensibleText
	}
	ext.extend({Text:ExtensibleText});
})(extensible);
