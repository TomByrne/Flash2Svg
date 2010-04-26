(function(dx){
	function ExtensibleBitmapInstance(instance,options){
		if(instance instanceof Instance){
			this.$=instance;
		}else if(instance && instance.$ && instance.$ instanceof Instance){
			this.$=instance.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			options.frame.timeline=options.timeline;
			this.cache.frame=options.frame;
		}
		return this;
	}
	ExtensibleBitmapInstance.prototype={
		__proto__:dx.Instance.prototype,
		$:null,//BitmapInstance
		type:ExtensibleBitmapInstance,
		//built in properties
		get hPixels(){return this.$.hPixels;},
		set hPixels(s){this.$.hPixels=s;},
		get vPixels(){return this.$.vPixels;},
		set vPixels(s){this.$.vPixels=s;},		
		//built in methods
		getBits:function(){return this.$.getBits();},
		setBits:function(bitmap){this.$.setBits(bitmap);},
		//
		getSVG:function(){
			return;
		},
		is:function(instance){
			return false;
		},
		get svg(){
			return this.getSVG();
		},
		set svg(){}
	}
	dx.extend({BitmapInstance:ExtensibleBitmapInstance});
})(dx);
