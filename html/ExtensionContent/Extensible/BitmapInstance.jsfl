(function(ext){
	function ExtensibleBitmapInstance(instance,options){
		ext.Instance.apply(this,arguments);
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
		setBits:function(bitmap){this.$.setBits(bitmap);},
		get libraryItem(){
			return(new ext.BitmapItem(this.$.libraryItem));
		},
		set libraryItem(s){
			this.$.libraryItem=s.$||s;
		}
	}
	ext.extend({BitmapInstance:ExtensibleBitmapInstance});
})(extensible);
