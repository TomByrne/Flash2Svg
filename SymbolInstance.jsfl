(function(dx){
	function ExtensibleSymbolInstance(instance,options){
		if(instance instanceof SymbolInstance){
			this.$=instance;
		}else if(instance && instance.$ && instance.$ instanceof SymbolInstance){
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
	ExtensibleSymbolInstance.prototype={
		__proto__:dx.Instance.prototype,
		$:SymbolInstance,
		type:ExtensibleSymbolInstance,
		//built in methods
		getSVG:function(){
			return false;
		},
		is:function(instance){
			return false;
		},
		get svg(){
			return this.getSVG();
		},
		set svg(){}
	}
	dx.extend({SymbolInstance:ExtensibleSymbolInstance});
})(dx);
