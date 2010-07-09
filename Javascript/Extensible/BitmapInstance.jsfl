(function(ext){
	function ExtensibleBitmapInstance(instance,options){
		ext.Element.apply(this,arguments);
		return this;
	}
	ExtensibleBitmapInstance.prototype={
		__proto__:ext.Instance.prototype,
		type:ExtensibleBitmapInstance,
		get hPixels(){return this.$.hPixels;},
		set hPixels(s){this.$.hPixels=s;},
		get vPixels(){return this.$.vPixels;},
		set vPixels(s){this.$.vPixels=s;},
		getBits:function(){return this.$.getBits();},
		setBits:function(bitmap){this.$.setBits(bitmap);}
	}
	ext.extend({BitmapInstance:ExtensibleBitmapInstance});
})(extensible);
