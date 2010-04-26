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
			this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			optoins.frame.timeline=options.timeline;
			this.cache.frame=options.frame;	
		}
		return this;
	}
	ExtensibleInstance.prototype={
		__proto__:dx.Element.prototype,
		type:ExtensibleInstance,
		//built in functions
		get instanceType(){return this.$.instanceType;},
		set instanceType(s){this.$.instanceType=s;},
		get libraryItem(){return this.$.libraryItem;},
		set libraryItem(s){this.$.libraryItem=s;},
		//
		get libraryItemObject(){
			return this.libraryItem;
		},
		set libraryItemObject(s){},
	}
	dx.extend({Instance:ExtensibleInstance});
})(dx);
