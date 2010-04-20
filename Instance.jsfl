(function(dx){
	function ExtensibleInstance(instance,options){
		if(instance instanceof Instance){
			this.$=instance;
		}else if(instance && instance.$ && instance.$ instanceof Instance){
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
	ExtensibleInstance.prototype={
		__proto__:dx.Element.prototype,
		$:Instance,
		type:ExtensibleInstance,
		get instanceType(){return this.$.instanceType;},
		set instanceType(){},
		get libraryItem(){return this.$.libraryItem;},
		set libraryItem(s){this.$.libraryItem=s;}
	}
	dx.extend({Instance:ExtensibleInstance});
})(dx);
