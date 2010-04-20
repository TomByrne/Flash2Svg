(function(dx){
	function ExtensibleBitmapInstance(instance,options){
		if(instance instanceof BitmapInstance){
			this.$=instance;
		}else if(instance && instance.$ && instance.$ instanceof BitmapInstance){
			this.$=instance.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame);
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			this.cache.frame=options.frame;
		}
		return this;
	}
	ExtensibleBitmapInstance.prototype={
		__proto__:dx.Instance.prototype,
		$:null,//BitmapInstance
		type:ExtensibleBitmapInstance,
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
