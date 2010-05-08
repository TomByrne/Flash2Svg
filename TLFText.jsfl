(function(ext){
	function ExtensibleTLFText(text,options){
		ext.Element.apply(this,arguments);
		return this;
	}
	ExtensibleTLFText.prototype={
		__proto__:ext.Element.prototype,
		type:ExtensibleTLFText
	};
	ext.extend({TLFText:ExtensibleTLFText});
})(extensible);
